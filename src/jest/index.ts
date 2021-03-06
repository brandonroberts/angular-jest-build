import {
  BuildEvent,
  Builder,
  BuilderConfiguration,
  BuilderContext,
} from '@angular-devkit/architect';
import { getSystemPath, normalize, resolve } from '@angular-devkit/core';
import { ProjectWorkspace, Runner } from 'jest-editor-support';
import { platform } from 'os';
import { Observable, of } from 'rxjs';
import { concatMap, take } from 'rxjs/operators';
const Process = require('jest-editor-support/build/Process');

export interface JestBuilderOptions {
  watch?: boolean;
  watchAll?: boolean;
  colors?: boolean;
  jestPath?: string;
  jestConfig?: string;
  updateSnapshots?: boolean;
}

export class JestBuilder implements Builder<JestBuilderOptions> {
  constructor(public context: BuilderContext) {}

  run(builderConfig: BuilderConfiguration<JestBuilderOptions>): Observable<BuildEvent> {
    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);
    const roots = { path: root, projectRoot };

    return of(null).pipe(
      concatMap(() => this._runJest(roots, options)),
      take(1),
    );
  }

  private _runJest(
    { path: rootPath }: { path: string; projectRoot: string },
    options: JestBuilderOptions,
  ): Observable<BuildEvent> {
    return new Observable(obs => {
      if (platform() == 'win32' && options.jestPath && !options.jestPath.endsWith('.cmd')) {
        options.jestPath += '.cmd';
      }

      const workspace = {
        rootPath: getSystemPath(normalize(rootPath)),
        pathToJest: getSystemPath(normalize(`${rootPath}/${options.jestPath}`)),
        pathToConfig: options.jestConfig ? getSystemPath(normalize(`${rootPath}/${options.jestConfig}`)) : undefined,
      } as ProjectWorkspace;

      const runner: Runner = new Runner(workspace, {
        createProcess: (workspace, args) => {
          const flags = args.filter(arg => arg.includes('--useStderr') || arg.includes('watch'));

          if (options.colors) {
            flags.push('--colors');
          }

          if (options.updateSnapshots) {
            flags.push('--updateSnapshot');
          }

          return Process.createProcess(workspace, flags, { shell: undefined });
        },
      });

      runner.start(options.watch, options.watchAll);

      runner.on('executableStdErr', message => {
        const msg: string = message.toString().trim();

        if (/(Watch Usage\b|\s*Press\b\s)/.test(msg)) {
          return;
        }

        console.log(msg);
      });
      runner.on('terminalError', (err: any) => {
        console.log('error', err);
        obs.error({ success: false });
      });

      return () => {
        obs.complete();
        runner.closeProcess();
      };
    });
  }
}

export default JestBuilder;
