import * as cdk from 'aws-cdk-lib';
import * as EmrDocker from '../lib/emr_docker-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new EmrDocker.EmrDockerStack(app, 'MyTestStack');
    // THEN
    const actual = app.synth().getStackArtifact(stack.artifactId).template;
    expect(actual.Resources ?? {}).toEqual({});
});
