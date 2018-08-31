# Shell command execution

Plugin allows to invoke any shell command.

## Action Handler: Exec

ID: com.fireblink.fbl.exec

Aliases:
 - fbl.exec
 - exec

**Example:**

```yaml
# executable to invoke
command: 'echo'
# additional executable arguments, note "command" cannot have arguments in its value, just executable alias or path to it
args: 
  - 'test'
# optional options :)
options:
  # if provided "stdout" will be included inside assigned object to proviced "ctx" and/or "secrets" name 
  stdout: true
  # if provided "stderr" will be included inside assigned object to proviced "ctx" and/or "secrets" name
  stderr: true
  # if provided - stdout and stderr will not be printed into console
  silent: true
# assign execution result {code: 0-255, stdout?: string, stderr?: string }
assignTo:
  # "ctx" variable name to assign results to
  ctx: 'test'
  # "secrets" variable name to assign results to
  secrets: 'test'
```