# Welcome to your CDK Pipelines project!

Bootstrap every target account and region with

```sh
cdk bootstrap --trust <DeploymentAccountID> --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

For cross-account deployment the S3 artifacts bucket needs to be encrypted.

```
const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      crossAccountKeys: true,
      synth: ...
```
## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
