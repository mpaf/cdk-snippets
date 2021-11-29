import { Stack, StackProps, aws_ec2 as ec2, aws_emr as emr, aws_iam as iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';

import * as path from 'path';

export class EmrDockerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const instanceType = ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO)
    
    const emrEC2Role = new iam.Role(this,'EMREC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonElasticMapReduceforEC2Role'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
      ]
    })

    const emrRole = new iam.Role(this,'EMRRole', {
      assumedBy: new iam.ServicePrincipal('elasticmapreduce.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonElasticMapReduceRole')]
    })

    const emrInstanceProfile = new iam.CfnInstanceProfile(this, 'EMRInstanceProfile', {
      roles: [emrEC2Role.roleName]
    })

    const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', {
      isDefault: true
    })

    const asset = new DockerImageAsset(this, 'SparkDockerImage', {
      directory: path.join(__dirname, 'sparkimage')
    });

    const fileAsset = new Asset(this, 'EMRBootstrapScript', {
      path: path.join(__dirname, 'bootstrapscript/emr_ssm.sh')
    });

    const cfnCluster = new emr.CfnCluster(this, 'MiguelEMRCluster', {
      instances: {
        ec2SubnetId: vpc.privateSubnets[0].subnetId,
        masterInstanceGroup: {
          instanceCount: 1,
          instanceType: "m5a.xlarge",
          market: "ON_DEMAND",
          name: "master"
          
        },
        coreInstanceGroup: {
          instanceCount: 1,
          instanceType: "c5a.xlarge",
          market: "ON_DEMAND",
          name: "core",
        }
      },
      bootstrapActions: [
        {
          name: 'installSSMAgent',
          scriptBootstrapAction: {
            path: fileAsset.s3ObjectUrl
          }
        }
      ],
      configurations: [
        {
          classification: "container-executor",
          configurationProperties:{
  
          },
          configurations: [
            {
              classification: "docker",
              configurationProperties: {
                  "docker.privileged-containers.registries": `local,centos,${asset.repository.repositoryUri}`,
                  "docker.trusted.registries": `local,centos,${asset.repository.repositoryUri}`
              }
            }
          ]
        },
        {
          classification: "livy-conf",
          configurationProperties: {
            "livy.spark.master": "yarn",
            "livy.spark.deploy-mode": "cluster",
            "livy.server.session.timeout": "16h"
          }
        },
        {
          classification: "hive-site",
          configurationProperties: {
            "hive.execution.mode":"container"
          }
        },
        {
          classification: "spark-defaults",
          configurationProperties: {
            "spark.executorEnv.YARN_CONTAINER_RUNTIME_TYPE":"docker",
            "spark.yarn.am.waitTime":"300s",
            "spark.yarn.appMasterEnv.YARN_CONTAINER_RUNTIME_TYPE":"docker",
            //"spark.executorEnv.YARN_CONTAINER_RUNTIME_DOCKER_CLIENT_CONFIG":"hdfs:///user/hadoop/config.json",
            "spark.executorEnv.YARN_CONTAINER_RUNTIME_DOCKER_IMAGE": asset.imageUri,
            "spark.executor.instances":"2",
            //"spark.yarn.appMasterEnv.YARN_CONTAINER_RUNTIME_DOCKER_CLIENT_CONFIG":"hdfs:///user/hadoop/config.json",
            "spark.yarn.appMasterEnv.YARN_CONTAINER_RUNTIME_DOCKER_IMAGE": asset.imageUri
          }
        }
      ],
      applications: [
        {
          name: "spark"
        },
        {
          name: "livy"
        }
      ],
      releaseLabel: "emr-6.4.0",
      name: 'MiguelEMRCluster',
      jobFlowRole: emrInstanceProfile.ref,
      serviceRole: emrRole.roleArn
    })
  }
}
