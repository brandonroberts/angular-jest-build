/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuildEvent,
  Builder,
  BuilderConfiguration,
  BuilderContext,
} from '@angular-devkit/architect';
import { Path, getSystemPath, normalize, resolve, tags } from '@angular-devkit/core';
import { Observable, from, of } from 'rxjs';
import { concatMap, take, tap } from 'rxjs/operators';
import { Runner, ProjectWorkspace } from 'jest-editor-support';
import * as path from 'path';

export interface JestBuilderOptions {
  watch?: boolean;
  watchAll?: boolean;
  workspace?: ProjectWorkspace;
}

export class JestBuilder implements Builder<JestBuilderOptions> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<JestBuilderOptions>): Observable<BuildEvent> {
    const options = builderConfig.options;
    const root = this.context.workspace.root;

    // TODO: verify using of(null) to kickstart things is a pattern.
    return of(null).pipe(
      concatMap(() => this._runJest(root, options)),
      take(1),
    );
  }

  private _runJest(root: string, options: JestBuilderOptions): Observable<BuildEvent> {
    return new Observable(obs => {
      const workspace: any = {
        pathToJest: path.resolve(__dirname + '../../../../../ngrx/platform/node_modules/.bin/jest')
      };
      const sut: any = new Runner(workspace);

      sut.start(options.watch, options.watchAll);
      sut.on('terminalError', (err) => {
          console.log('error', err);
          obs.error({ success: false });
      });
      sut.on('executableJSON', (data) => {
          console.log('json', data);
      });
      sut.on('executableOutput', (data) => {
          console.log('output', data);
      });            
      sut.on('exit', () => {
          obs.next({ success: true });
      });
      sut.on('debuggerProcessExit', () => {
          console.log('debugger exit');
          obs.next({ success: true });
      });            

      return () => {
          obs.complete();
          sut.closeProcess();
      }
    });
  }
}

export default JestBuilder;
