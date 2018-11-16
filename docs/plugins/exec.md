# Shell command execution

Plugin allows to invoke any shell command.

## Action Handler: Exec

**ID:** `com.fireblink.fbl.exec`

**Aliases:**
 - `fbl.exec`
 - `exec`

**Example:**

```yaml
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
assignResultTo:
  # [optional] "ctx" variable name to assign results to ("test")
  ctx: '$.test'
  # [optional] "secrets" variable name to assign results to ("test")
  secrets: '$.test'
  # [optional] "parameters" variable name to assign results to ("test")
  parameters: '$.test'
  
# [optional] push execution result {code: 0-255, stdout?: string, stderr?: string }
pushResultTo:
  # [optional] "ctx" variable name to push result to ("test")
  ctx: '$.test'
  # [optional] "secrets" variable name to push result to ("test")
  secrets: '$.test'
  # [optional] "parameters" variable name to push result to ("test")
  parameters: '$.test'
```

## Action Handler: Shell

**ID:** `com.fireblink.fbl.shell`

**Aliases:**
 - `fbl.shell`
 - `shell`

**Example:**

```yaml
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
assignResultTo:
  # [optional] "ctx" variable name to assign results to ("test")
  ctx: '$.test'
  # [optional] "secrets" variable name to assign results to ("test")
  secrets: '$.test'
  # [optional] "parameters" variable name to assign results to ("test")
  parameters: '$.test'
  
# [optional] push execution result {code: 0-255, stdout?: string, stderr?: string }
pushResultTo:
  # [optional] "ctx" variable name to push result to ("test")
  ctx: '$.test'
  # [optional] "secrets" variable name to push result to ("test")
  secrets: '$.test'
  # [optional] "parameters" variable name to push result to ("test")
  parameters: '$.test'
```