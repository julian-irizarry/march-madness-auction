import aws_cdk as cdk
from aws_cdk import (
    aws_iam as iam,
    Duration,
    CfnOutput,
)
from constructs import Construct


class OidcStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        github_provider = iam.OpenIdConnectProvider(
            self,
            "GitHubOidc",
            url="https://token.actions.githubusercontent.com",
            client_ids=["sts.amazonaws.com"],
            thumbprints=["6938fd4d98bab03faadb97b34396831e3780aea1"],
        )

        deploy_role = iam.Role(
            self,
            "GitHubActionsDeployRole",
            role_name="GitHubActionsDeployRole",
            assumed_by=iam.FederatedPrincipal(
                github_provider.open_id_connect_provider_arn,
                conditions={
                    "StringEquals": {
                        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                    },
                    "StringLike": {
                        "token.actions.githubusercontent.com:sub": "repo:julian-irizarry/march_madness_auction:*",
                    },
                },
                assume_role_action="sts:AssumeRoleWithWebIdentity",
            ),
            max_session_duration=Duration.hours(1),
        )

        deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "ecr:GetAuthorizationToken",
                    "ecr:BatchCheckLayerAvailability",
                    "ecr:PutImage",
                    "ecr:InitiateLayerUpload",
                    "ecr:UploadLayerPart",
                    "ecr:CompleteLayerUpload",
                    "ecr:BatchDeleteImage",
                    "ecr:DescribeRepositories",
                    "ecr:CreateRepository",
                ],
                resources=["*"],
            )
        )

        deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "cloudformation:*",
                    "ecs:*",
                    "ec2:*",
                    "elasticloadbalancing:*",
                    "iam:PassRole",
                    "iam:GetRole",
                    "iam:CreateRole",
                    "iam:DeleteRole",
                    "iam:AttachRolePolicy",
                    "iam:DetachRolePolicy",
                    "iam:PutRolePolicy",
                    "iam:DeleteRolePolicy",
                    "logs:*",
                    "autoscaling:*",
                    "route53:*",
                    "acm:*",
                    "ssm:GetParameter",
                ],
                resources=["*"],
            )
        )

        CfnOutput(self, "DeployRoleArn", value=deploy_role.role_arn)
