# Shell and JavaScript Function execution

Plugin allows to invoke any shell command.

Available actions:

- [exec](exec.md#action-handler-shell-command) - execute single command
- [shell](exec.md#action-handler-shell-script) - execute shell script
- [fn](exec.md#action-handler-function) - execute JS function

## Action Handler: Shell Command

Invoice single shell command.

**ID:** `com.fireblink.fbl.exec`

**Aliases:**

- `fbl.exec`
- `exec`

**Example:**

```yaml
exec:
  # executable to invoke
  command: 'echo'

  # additional executable arguments, note "command" cannot have arguments in its value, just executable alias or path to it
  args:
    - 'test'

  # [optional] working directory to run command from.
  # Default value: flow's folder
  wd: <%- cwd %>

  # [optional] options
  options:
    # [optional] if provided "stdout" will be included inside assigned object to proviced "ctx" and/or "secrets" name
    stdout: true
    # [optional]  if provided "stderr" will be included inside assigned object to proviced "ctx" and/or "secrets" name
    stderr: true
    # [optional] if provided - stdout and stderr will be logged in report and printed to console
    verbose: false

  # [optional] assign execution result {code: 0-255, stdout?: string, stderr?: string }
  assignResultTo: # follows common assignment logic practicies https://fbl.fireblink.com/plugins/common#assign-to

  # [optional] push execution result {code: 0-255, stdout?: string, stderr?: string }
  pushResultTo: # follows common push logic practicies https://fbl.fireblink.com/plugins/common#push-to
```

## Action Handler: Shell Script

Invoke shell script. While it gives a more convinient way to integrate shell scripts into the flow it also makes your flow less platform agnostic.

**ID:** `com.fireblink.fbl.shell`

**Aliases:**

- `fbl.shell`
- `shell`

**Example:**

```yaml
shell:
  # shell executable
  executable: '/bin/bash'

  # script to be invoked
  script: |-
    cd /tmp
    touch test.txt

  # [optional] working directory to run script from.
  # Default value: flow's folder
  wd: <%- cwd %>

  # [optional] options
  options:
    # [optional] if provided "stdout" will be included inside assigned object to proviced "ctx" and/or "secrets" name
    stdout: true
    # [optional] if provided "stderr" will be included inside assigned object to proviced "ctx" and/or "secrets" name
    stderr: true
    # [optional] if provided - stdout and stderr will be logged in report and printed to console
    verbose: false

  # [optional] assign execution result {code: 0-255, stdout?: string, stderr?: string }
  assignResultTo: # follows common assignment logic practicies https://fbl.fireblink.com/plugins/common#assign-to

  # [optional] push execution result {code: 0-255, stdout?: string, stderr?: string }
  ushResultTo: # follows common push logic practicies https://fbl.fireblink.com/plugins/common#push-to
```

## Action Handler: Function

Allows to invoke custom JavaScript script \(ES6\). Script has access to all context variables:

- cwd
- ctx
- secrets
- parameters
- iteration

But also to Node.js `require` function and can interact with awailable node modules. Though, it is recomended to use fbl plugins instead.

**ID:** `com.fireblink.fbl.function`

**Aliases:**

- `fbl.function`
- `function`
- `function()`
- `fn`
- `fn()`

**Example: Direct Changes**

```yaml
# Action handler expects valid JS function content string.
#
# Note: script is wrapped into async function, so you can "await" promises inside it
# if you need to do some long running operations.
fn: |-
  ctx.isWindows = require('os').platform() === 'win32';
```

**Example: Overrides**

Alternativelly function can return object that will be used to override entire state of context and parameters fields.

```yaml
fn: |-
  return {
    cwd: '/tmp',
    ctx: {
      test: true
    }      
  }
```

```yaml
fn: |-
  return {
    secrets: {
      test: true
    },
    parameters: {
      p1: ctx.p2
    }
  }
```
