# Welcome to EMR with Docker and Session Manager support!

This is a typescript-based CDK app for creating a private EMR cluster that
uses docker for submitting spark jobs.

The cluster master and core instances have no SSH key installed, and have no ports open to the outside. The instances are
accessible via [AWS Systems Manager Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html) (AWS SSM)
 The EMR cluster uses a bootstrapping script in order to install the SSM agent.

The default docker image is built and published to ECR in this same app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template