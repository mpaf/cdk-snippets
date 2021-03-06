import { Stack, StackProps, CfnOutput, Stage, StageProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import * as pipelines from 'aws-cdk-lib/pipelines'
import { Construct } from 'constructs';
import * as path from 'path';
import { CodePipelineSource } from 'aws-cdk-lib/pipelines';

export class CdkPipelineAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const handler = new lambda.Function(this, 'Lambda', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.resolve(__dirname, 'lambda/')),
    });

    // An API Gateway to make the Lambda web-accessible
    const gw = new apigw.LambdaRestApi(this, 'Gateway', {
      description: 'Endpoint for a simple Lambda-powered web service',
      handler,
    });

    const urlOutput = new CfnOutput(this, 'Url', {
      value: gw.url,
    });
  }
}

/**
 * Stack to hold the pipeline
 */
 export class MyPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      crossAccountKeys: true,
      synth: new pipelines.ShellStep('Synth', {
        // Use a connection created using the AWS console to authenticate to GitHub
        // Other sources are available.
        input: CodePipelineSource.gitHub('mpaf/cdk-snippets', 'main'),
        primaryOutputDirectory: 'CDKPipelineApp/cdk.out',
        commands: [
          'cd CDKPipelineApp',
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ],
      })
    });

    // 'MyApplication' is defined below. Call `addStage` as many times as
    // necessary with any account and region (may be different from the
    // pipeline's).
    pipeline.addStage(new MyApplication(this, 'Dev', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
      },
    }));

    const prodStage = new MyApplication(this, 'Prod', {
      env: {
        account: "025149409875",
        region: "eu-west-1"
      },
    })

    pipeline.addStage(prodStage, {
      pre: [
        new pipelines.ConfirmPermissionsBroadening('Check', {stage: prodStage}),
      ],
      stackSteps: [{
        stack: prodStage.appStack,
        changeSet: [new pipelines.ManualApprovalStep('ChangeSet Approval')],
      }],
      post: [new pipelines.ShellStep('Validate Endpoint',
      {
        commands: ['curl -Ssf https://www.google.com/']
      })]
    });
  }
}

class MyApplication extends Stage {
  public readonly appStack: Stack;

  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    this.appStack = new CdkPipelineAppStack(this, 'LambdaApp');
  }
}