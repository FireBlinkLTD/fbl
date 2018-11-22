# FBL Flow

## Format

FBL expecting flows to be presented as YAML files with following format:
  
```yaml
# [optional] flow version, used for informational purposes only.
version: 1.0.0

# [optional] flow description, used for informational purposes only. 
description: |-
  Plugn invoker.

# [optional] flow runtime dependencies
requires:
  # [optional] fbl version requirements
  fbl: '>=1.1.0'

  # [optional] required plugins and their versions
  plugins:
    '@fbl-plugins/http': '>=0.1.0'

  # [optional] required native applications presented in the PATH environment variable
  applications:
  - echo

# [required] entry point
pipeline:
  # Pipeline may only have one root action ID (or alias).
  # Value format is specific to the action. Each action may have its own format and requirements.  
  exec: 
    command: echo
    args: 
      - 'Hello World'

  # Metadata
  # Each action may have zero or more additional metadata fields associated with it.
  # All metadata fields follow same naming convention: they all start with dollar sign - $.
  # Action ID or aliases could not start with $.   
  $title: 'Say hello'
```

In most cases you will use [flow](flow.md) control action handlers as a starting point of your flow.