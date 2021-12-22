import { Stack, StackProps, Fn, CfnOutput, Stage, StageProps, aws_ecr_assets, aws_apprunner, aws_iam } from 'aws-cdk-lib';
import * as pipelines from 'aws-cdk-lib/pipelines'
import { Construct } from 'constructs';
import * as path from 'path';
import { CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { ImagePullPrincipalType } from 'aws-cdk-lib/aws-codebuild';

export class DockerStack extends Stack {

  public readonly imageURI: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const image = new aws_ecr_assets.DockerImageAsset(this, 'hello-world-container', {
      directory: path.join(__dirname, 'container'),
    });

    const output = new CfnOutput(this, 'ImageURI', {
      value: image.imageUri
    });
    
    this.imageURI = image.imageUri

  }
}

class DockerBuildStage extends Stage {

  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const docker_stack = new DockerStack(this, 'DockerBuild');

  }
}

interface AppRunnerStackProps extends StackProps {
  imageURI: string
}

export class AppRunnerStack extends Stack {
  constructor(scope: Construct, id: string, props: AppRunnerStackProps) {
    super(scope, id, props);

    const apprunnerRole = new aws_iam.Role(this, 'apprunner-role', {
      roleName: 'apprunner-role',
      assumedBy: new aws_iam.ServicePrincipal('build.apprunner.amazonaws.com')
    })

    apprunnerRole.addToPolicy(
      new aws_iam.PolicyStatement({
        actions: ['ecr:*'],
        effect: aws_iam.Effect.ALLOW,
        resources: ['*']
      })
    )

    const apprunner = new aws_apprunner.CfnService(this, 'apprunner', {
      sourceConfiguration: {
        authenticationConfiguration: {
          accessRoleArn: apprunnerRole.roleArn
        },
        imageRepository: {
          imageIdentifier: props.imageURI,
          imageRepositoryType: 'ECR',
          imageConfiguration: {
            port: '80'
          }
        },
      },
      serviceName: 'apprunner-sample',
    });

  }
}

interface AppRunnerStageProps extends StageProps {
  imageURI: string
}

class AppRunerStage extends Stage {
  constructor(scope: Construct, id: string, props: AppRunnerStageProps) {
    super(scope, id, props);

    const app_stack = new AppRunnerStack(this, 'AppRunner', {
      imageURI: props.imageURI
    })
  }
}

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
    
    const image = new aws_ecr_assets.DockerImageAsset(this, 'hello-world-container', {
      directory: path.join(__dirname, 'container'),
    });
    
    pipeline.addStage(new AppRunerStage(this, 'Dev', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
      },
      imageURI: image.imageUri
    }));

    const prodStage = new AppRunerStage(this, 'Prod', {
      env: {
        account: "025149409875",
        region: "eu-west-1"
      },
      imageURI: image.imageUri
    })

    pipeline.addStage(prodStage);
  }
}

