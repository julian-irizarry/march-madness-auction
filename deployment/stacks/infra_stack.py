import os
import time
import aws_cdk as cdk
from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecr as ecr,
    aws_elasticloadbalancingv2 as elbv2,
    aws_autoscaling as autoscaling,
    aws_certificatemanager as acm,
    aws_route53 as route53,
    aws_route53_targets as targets,
    aws_logs as logs,
    aws_iam as iam,
    CfnOutput,
    Duration,
    RemovalPolicy,
)
from constructs import Construct


DOMAIN_NAME = "mmauctiongame.com"


class InfraStack(cdk.Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        image_tag: str = "latest",
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ---- VPC (default) ----
        vpc = ec2.Vpc.from_lookup(self, "DefaultVpc", is_default=True)

        # ---- Route 53 ----
        hosted_zone = route53.HostedZone.from_lookup(
            self, "HostedZone", domain_name=DOMAIN_NAME
        )

        # ---- ACM Certificate ----
        certificate = acm.Certificate(
            self,
            "SiteCert",
            domain_name=DOMAIN_NAME,
            validation=acm.CertificateValidation.from_dns(hosted_zone),
        )
        certificate.apply_removal_policy(RemovalPolicy.RETAIN)

        # ---- ECR Repository ----
        repo = ecr.Repository(
            self,
            "AppRepo",
            repository_name="march-madness-auction",
            removal_policy=RemovalPolicy.RETAIN,
        )

        # ---- Security Groups ----
        alb_sg = ec2.SecurityGroup(self, "AlbSg", vpc=vpc, allow_all_outbound=True)
        alb_sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(80))
        alb_sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(443))

        ecs_sg = ec2.SecurityGroup(self, "EcsSg", vpc=vpc, allow_all_outbound=True)
        ecs_sg.add_ingress_rule(alb_sg, ec2.Port.tcp(80))
        ecs_sg.add_ingress_rule(alb_sg, ec2.Port.tcp(8000))

        # ---- ALB ----
        alb = elbv2.ApplicationLoadBalancer(
            self, "Alb", vpc=vpc, internet_facing=True, security_group=alb_sg
        )

        # HTTP -> HTTPS redirect
        alb.add_listener(
            "HttpListener",
            port=80,
            default_action=elbv2.ListenerAction.redirect(
                protocol="HTTPS", port="443", permanent=True
            ),
        )

        https_listener = alb.add_listener(
            "HttpsListener",
            port=443,
            certificates=[certificate],
            default_action=elbv2.ListenerAction.fixed_response(
                status_code=404, content_type="text/plain", message_body="Not found"
            ),
        )

        # ---- DNS ----
        route53.ARecord(
            self,
            "SiteAliasRecord",
            zone=hosted_zone,
            target=route53.RecordTarget.from_alias(targets.LoadBalancerTarget(alb)),
        )

        # ---- ECS Cluster ----
        cluster = ecs.Cluster(self, "Cluster", vpc=vpc, cluster_name="march-madness")

        # ---- ECS Task Execution Role ----
        task_execution_role = iam.Role(
            self,
            "TaskExecutionRole",
            assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AmazonECSTaskExecutionRolePolicy"
                )
            ],
        )
        repo.grant_pull(task_execution_role)

        # ---- ASG (1x t3.micro) ----
        asg = autoscaling.AutoScalingGroup(
            self,
            "Asg",
            vpc=vpc,
            instance_type=ec2.InstanceType("t3.micro"),
            machine_image=ecs.EcsOptimizedImage.amazon_linux2(),
            min_capacity=1,
            max_capacity=1,
            security_group=ecs_sg,
        )
        cluster.add_asg_capacity_provider(
            autoscaling.AsgCapacityProvider(
                self, "AsgCapacityProvider", auto_scaling_group=asg
            )
        )

        deploy_timestamp = str(int(time.time()))

        # ---- Frontend Task + Service ----
        frontend_task = ecs.Ec2TaskDefinition(
            self, "FrontendTask", execution_role=task_execution_role,
            network_mode=ecs.NetworkMode.BRIDGE,
        )
        frontend_task.add_container(
            "frontend",
            image=ecs.ContainerImage.from_ecr_repository(
                repo, tag=f"frontend-{image_tag}"
            ),
            memory_limit_mib=256,
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix="frontend",
                log_retention=logs.RetentionDays.ONE_WEEK,
            ),
            environment={"DEPLOY_TIMESTAMP": deploy_timestamp},
            port_mappings=[
                ecs.PortMapping(container_port=3000, host_port=80)
            ],
        )

        frontend_service = ecs.Ec2Service(
            self,
            "FrontendService",
            cluster=cluster,
            task_definition=frontend_task,
            desired_count=1,
            min_healthy_percent=0,
        )

        # ---- Backend Task + Service ----
        backend_task = ecs.Ec2TaskDefinition(
            self, "BackendTask", execution_role=task_execution_role,
            network_mode=ecs.NetworkMode.BRIDGE,
        )
        backend_task.add_container(
            "backend",
            image=ecs.ContainerImage.from_ecr_repository(
                repo, tag=f"backend-{image_tag}"
            ),
            memory_limit_mib=256,
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix="backend",
                log_retention=logs.RetentionDays.ONE_WEEK,
            ),
            environment={
                "ENVIRONMENT": "production",
                "DEPLOY_TIMESTAMP": deploy_timestamp,
            },
            port_mappings=[
                ecs.PortMapping(container_port=8000, host_port=8000)
            ],
        )

        backend_service = ecs.Ec2Service(
            self,
            "BackendService",
            cluster=cluster,
            task_definition=backend_task,
            desired_count=1,
            min_healthy_percent=0,
        )

        # ---- ALB Target Groups ----
        frontend_tg = https_listener.add_targets(
            "FrontendTarget",
            port=80,
            protocol=elbv2.ApplicationProtocol.HTTP,
            targets=[frontend_service],
            priority=50,
            conditions=[elbv2.ListenerCondition.path_patterns(["/*"])],
            health_check=elbv2.HealthCheck(path="/", healthy_http_codes="200"),
        )

        backend_tg = https_listener.add_targets(
            "BackendTarget",
            port=8000,
            protocol=elbv2.ApplicationProtocol.HTTP,
            targets=[backend_service],
            priority=10,
            conditions=[elbv2.ListenerCondition.path_patterns(["/api/*", "/ws/*"])],
            health_check=elbv2.HealthCheck(
                path="/docs", healthy_http_codes="200"
            ),
        )

        CfnOutput(self, "AlbDns", value=alb.load_balancer_dns_name)
        CfnOutput(self, "SiteUrl", value=f"https://{DOMAIN_NAME}")
