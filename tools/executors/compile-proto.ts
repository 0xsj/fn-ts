import { ExecutorContext } from '@nrwl/devkit';
import { execSync } from 'child_process';
import { join } from 'path';

export interface CompileProtobufsExecutorOptions {
  protoSrc: string;
  output: string;
}

export default async function runExecutor(
  options: CompileProtobufsExecutorOptions,
  context: ExecutorContext
) {
  const projectRoot = context.workspace.projects[context.projectName].root;

  // Ensure output directory exists
  execSync(`mkdir -p ${options.output}`, { stdio: 'inherit' });

  // Compile protobuf files
  execSync(
    `protoc --plugin=protoc-gen-ts=node_modules/.bin/protoc-gen-ts --js_out=import_style=commonjs,binary:${options.output} --ts_out=service=grpc-node,mode=grpc-js:${options.output} -I ${options.protoSrc} ${options.protoSrc}/*.proto`,
    { stdio: 'inherit' }
  );

  console.log(`Protobuf files compiled successfully to ${options.output}`);
  return { success: true };
}
