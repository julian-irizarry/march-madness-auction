#!/usr/bin/env python3
import os

import aws_cdk as cdk
from stacks import InfraStack, OidcStack

app = cdk.App()

env = cdk.Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region="us-east-1",
)

OidcStack(app, "MarchMadnessOidc", env=env)

image_tag = app.node.try_get_context("image-tag") or "latest"
InfraStack(app, "MarchMadnessInfra", env=env, image_tag=image_tag)

app.synth()
