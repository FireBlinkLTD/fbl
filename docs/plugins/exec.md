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

# [optional] options
options:
  # [optional] if provided "stdout" will be included inside assigned object to proviced "ctx" and/or "secrets" name 
  stdout: true
  # [optional]  if provided "stderr" will be included inside assigned object to proviced "ctx" and/or "secrets" name
  stderr: true
  # [optional] if provided - stdout and stderr will be logged in report and printed to console
  verbose: false

# [optional] assign execution result {code: 0-255, stdout?: string, stderr?: string }
assignTo:
  # [optional] "ctx" variable name to assign results to ("test")
  ctx: '$.test'
  # [optional] "secrets" variable name to assign results to ("test")
  secrets: '$.test'
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
  
# [optional] options
options:
  # [optional] if provided "stdout" will be included inside assigned object to proviced "ctx" and/or "secrets" name 
  stdout: true
  # [optional] if provided "stderr" will be included inside assigned object to proviced "ctx" and/or "secrets" name
  stderr: true
  # [optional] if provided - stdout and stderr will be logged in report and printed to console
  verbose: false
    
# [optional] assign execution result {code: 0-255, stdout?: string, stderr?: string }
assignTo:
  # [optional] "ctx" variable name to assign results to ("test")
  ctx: '$.test'
  # [optional] "secrets" variable name to assign results to ("test")
  secrets: '$.test'
```