# CLI Prompts Plugin

Prompt user over CLI.

##  Action Handler: Confirm
   
Ask user to confirm something.
   
**ID:** `com.fireblink.fbl.cli.prompts.confirm`

**Aliases:**
- `fbl.cli.prompts.confirm`
- `cli.prompts.confirm`
- `prompts.confirm`
- `confirm`

**Example:**

```yaml
confirm:
    # [required] confirm message
    message: 'Are you sure you want to proceed?'
    
    # [optional] default response value
    default: false
    
    # [optional] either "assignResponseTo" or "pushResponseTo" should exist
    assignResponseTo:
      # [optional] "ctx" variable name to assign response to ("test")
      ctx: '$.test'
      # [optional] "secrets" variable name to assign response to ("test")
      secrets: '$.test'
      # [optional] "parameters" variable name to assign response to ("test")
      parameters: '$.test'
      
    # [optional] either "assignResponseTo" or "pushResponseTo" should exist
    pushResponseTo:
      # [optional] "ctx" variable name to assign response to ("test")
      ctx: '$.test'
      # [optional] "secrets" variable name to assign response to ("test")
      secrets: '$.test'
      # [optional] "parameters" variable name to assign response to ("test")
      parameters: '$.test'
```

##  Action Handler: Prompt

Ask user to type the response.

**ID:** `com.fireblink.fbl.cli.prompts.prompt`

**Aliases:**
- `fbl.cli.prompts.prompt`
- `cli.prompts.prompt`
- `prompts.prompt`
- `prompt`

**Example:**

```yaml
prompt:
    # [required] confirm message
    message: 'Are you sure you want to proceed?'
    
    # [optional] whether answer should be masked
    password: false
    
    # [optional] default response
    default: "not sure"
    
    # [optional] json schema validation schema
    # note: only "string", "integer" and "number" types are supported
    schema:
        type: string
    
    # [optional] either "assignResponseTo" or "pushResponseTo" should exist
    assignResponseTo:
      # [optional] "ctx" variable name to assign response to ("test")
      ctx: '$.test'
      # [optional] "secrets" variable name to assign response to ("test")
      secrets: '$.test'
      # [optional] "parameters" variable name to assign response to ("test")
      parameters: '$.test'
      
    # [optional] either "assignResponseTo" or "pushResponseTo" should exist
    pushResponseTo:
      # [optional] "ctx" variable name to assign response to ("test")
      ctx: '$.test'
      # [optional] "secrets" variable name to assign response to ("test")
      secrets: '$.test'
      # [optional] "parameters" variable name to assign response to ("test")
      parameters: '$.test'
```

##  Action Handler: Select

Ask user to select one given answer from provided options.

**ID:** `com.fireblink.fbl.cli.prompts.select`

**Aliases:**
- `fbl.cli.prompts.select`
- `cli.prompts.select`
- `prompts.select`
- `select`

**Example:**

```yaml
select:
    # [required] confirm message
    message: 'Pick your age:'
    
    # [optional] default selected option
    default: "I don't want to answer"
    
    # [required] list of options user needs to pick answer from
    options:
     - I don't want to answer
     - under 21
     - 21 - 59
     - 60+
    
   # [optional] either "assignResponseTo" or "pushResponseTo" should exist
   assignResponseTo:
     # [optional] "ctx" variable name to assign response to ("test")
     ctx: '$.test'
     # [optional] "secrets" variable name to assign response to ("test")
     secrets: '$.test'
     # [optional] "parameters" variable name to assign response to ("test")
     parameters: '$.test'
     
   # [optional] either "assignResponseTo" or "pushResponseTo" should exist
   pushResponseTo:
     # [optional] "ctx" variable name to assign response to ("test")
     ctx: '$.test'
     # [optional] "secrets" variable name to assign response to ("test")
     secrets: '$.test'
     # [optional] "parameters" variable name to assign response to ("test")
     parameters: '$.test'
```

##  Action Handler: Multi Select

Aks user to pick one or more options.

**ID:** `com.fireblink.fbl.cli.prompts.multiselect`

**Aliases:**
- `fbl.cli.prompts.multiselect`
- `cli.prompts.multiselect`
- `prompts.multiselect`
- `multiselect`

**Example:**

```yaml
multiselect:
    # [required] confirm message
    message: 'Select tags:'
    
    # [optional] default selected option
    default: ["music"]
    
    # [required] list of options user needs to pick answer from
    options:
     - music
     - art
     
    # [optional] either "assignResponseTo" or "pushResponseTo" should exist
    assignResponseTo:
      # [optional] "ctx" variable name to assign response to ("test")
      ctx: '$.test'
      # [optional] "secrets" variable name to assign response to ("test")
      secrets: '$.test'
      # [optional] "parameters" variable name to assign response to ("test")
      parameters: '$.test'
      
    # [optional] either "assignResponseTo" or "pushResponseTo" should exist
    pushResponseTo:
      # [optional] "ctx" variable name to assign response to ("test")
      ctx: '$.test'
      # [optional] "secrets" variable name to assign response to ("test")
      secrets: '$.test'
      # [optional] "parameters" variable name to assign response to ("test")
      parameters: '$.test'
```