# Context manipulation plugin

Upon flow execution each action handler gets access to shared context. 

Shared Context structure:

```yaml
# directory path from where fbl command was executed
cwd: string

# ctx is generally the place where non-secret transient data should be stored
ctx:
  key: value 
  
# place to store secrets, report will mask of secrets to prevent any security leakage  
secrets:
   key: secret

# action handlers may register entities they processed 
entities:
    # "registered" by convention should store all created or updated entities  
    registered:  
      - id: string | number
        type: string
        payload:
    
    # unregistered by convention should store all removed entities
    unregistered: []
    
    # only entities that were created, same entities should also exist in "registered" list
    created: []
    
    # only entities that were updated, same entities should also exist in "registered" list
    updated: []
    
    # only entities that were deleted, same entities should also exist in "unregistered" list
    deleted: []

# Summary records
summary: []  
```

(EJS)[http://ejs.co/] template can be used inside options to pass values from shared context. 
Please refer to plugin documentation if this feature supported and what options are required.

Example:

```yaml
version: 1.0.0
pipeline:
  plugin:
    # Pass "something" from "ctx" 
    contextValue: <%- ctx.something  %>
    # Pass "password" from "secrets"
    secretValue: <%- secrets.password %>
``` 

## Action Handler: Context Values Assignment

Assign non-secret values to context ("ctx"). May be used to provide "global" configuration. 

**ID:** `com.fireblink.fbl.context.values`

**Aliases:**
 - `fbl.context.values`
 - `context.values`
 - `context`
 - `ctx`
 
**Example 1: Assign values to context root directly:**

```yaml
ctx:
  # assign to "ctx" directly 
  '$': 
    inline:
      something: true
      else: false  
```

**Example 2: Assign values from file "vars.yml" to field "vars -> files":**

```yaml
ctx: 
  # create hierarchy of objects: "files" inside "vars" that is inside "ctx"
  $.vars: 
    files: 
     - vars.yml    
```

**Example 3: Assign values from file "vars.yml" after inline ones:**
```yaml
ctx: 
  '$':
    inline: 
      test: true 
    files: 
     - vars.yml 
    # specify that files have a priority over inline vars
    # if not provided inline vars will have priority over files
    priority: 'files'   
```

**Example 4: Override instead of assigning**
```yaml
ctx: 
  '$.test':
    inline: 
      test: true
    # [optional] override everything tha tis inside "test" object with { test: true }
    # use with caution
    override: true       
```

**Example 5: Push to array**
```yaml
ctx:
  '$.test':
    inline: 1      
    # [optional] override everything tha tis inside "test" object with { test: true }
    # use with caution
    override: true
    # [required] if you want to push inline or value(s) from file(s) to array
    push: true 
    # [optional] if enambled and value is array its child items will be pushed instead of array itself
    children: false    
```

## Action Handler: Secret Values Assignment

Same as above, but for secrets. All the options will me masked in report to prevent any security leakage. 

**ID:** `com.fireblink.fbl.secret.values`

**Aliases:**
 - `fbl.secret.values`
 - `secret.values`
 - `secrets`
 - `secret`
 
**Example 1: Assign values to secrets root directly:**
 
 ```yaml
 secrets: 
   '$': 
     inline:
       something: true
       else: false  
 ```
 
**Example 2: Assign values from file "vars.yml" to field "vars -> files":**
 
 ```yaml
 secrets: 
   $.vars: 
     files: 
      - vars.yml    
 ```
 
 **Example 3: Assign values from file "vars.yml" after inline ones:**
 ```yaml
 secrets: 
   '.':
     inline: 
       test: true 
     files: 
      - vars.yml 
     
     # [optional] specify that files have a priority over inline vars
     # if not provided inline vars will have priority over files
     priority: 'files'   
 ```
 
 **Example 4: Override instead of assigning**
 ```yaml
 secrets: 
   '$.test':
     inline: 
       test: true
     # [optional] override everything tha tis inside "test" object with { test: true }
     # use with caution
     override: true       
 ```
 
**Example 5: Push to array**
 ```yaml
 secrets:
   '$.test':
     inline: 1      
     # [optional] override everything tha tis inside "test" object with { test: true }
     # use with caution
     override: true
     # [required] if you want to push inline or value(s) from file(s) to array
     push: true 
     # [optional] if enambled and value is array its child items will be pushed instead of array itself
     children: false    
 ```

## Action Handler: Mark entities as registered

Mark some entity as registered, meaning it supposed to exist.

Example use case: you want to keep some default entity upon cleanup that is not created/update with your script, 
but script itself in the end has some cleanup logic based on "registered" entities list. 

**ID:** `com.fireblink.fbl.context.entities.registered`

**Aliases:**
 - `fbl.context.entities.registered`
 - `context.entities.registered`
 - `entities.registered`
 
**Example:**
  
```yaml
entities.registered: 
    # Object type/class/etc
  - type: User
    # Entity Identity, can be a string or number
    id: 1002
    # [optional] payload that may represent other or all fields of the entity
    payload:
      username: foobar        
```

## Action Handler: Mark entities as un-registered

Opposite to one above. Mark some entity to no longer exist. 

**ID:** `com.fireblink.fbl.context.entities.registered`

**Aliases:**
 - `fbl.context.entities.unregistered`
 - `context.entities.unregistered`
 - `entities.unregistered`
 
**Example:**
  
```yaml
entities.unregistered: 
    # Object type/class/etc
  - type: User
    # Entity Identity, can be a string or number
    id: 1002
    # [optional] payload that may represent other or all fields of the entity
    payload:
      username: foobar        
```

## Action Handler: Mark entities as created

Mark some entity as just created. Will also register entity, so it will be presented in 2 places: `entities.registered` and `entities.created` 

**ID:** `com.fireblink.fbl.context.entities.created`

Aliases:
 - `fbl.context.entities.created`
 - `context.entities.created`
 - `entities.created`
 
**Example:**
  
```yaml
entities.created: 
    # Object type/class/etc
  - type: User
    # Entity Identity, can be a string or number
    id: 1002
    # [optional] payload that may represent other or all fields of the entity
    payload:
      username: foobar        
```

## Action Handler: Mark entities as updated

Mark some entity as just updated. Will also register entity, so it will be presented in 2 places: `entities.registered` and `entities.updated` 

**ID:** `com.fireblink.fbl.context.entities.updated`

**Aliases:**
 - `fbl.context.entities.updated`
 - `context.entities.updated`
 - `entities.updated`
 
**Example:**
  
```yaml
entities.created: 
    # Object type/class/etc
  - type: User
    # Entity Identity, can be a string or number
    id: 1002
    # [optional] payload that may represent other or all fields of the entity
    payload:
      username: foobar        
```

## Action Handler: Mark entities as deleted

Mark some entity as just deleted. Will also un-register entity, so it will be presented in 2 places: `entities.unregistered` and `entities.deleted` 

**ID:** `com.fireblink.fbl.context.entities.deleted`

**Aliases:**
 - `fbl.context.entities.deleted`
 - `context.entities.deleted`
 - `entities.deleted`
 
**Example:**
  
```yaml
entities.deleted: 
    # Object type/class/etc
  - type: User
    # Entity Identity, can be a string or number
    id: 1002
    # [optional] payload that may represent other or all fields of the entity
    payload:
      username: foobar        
```

## Action Handler: Summary

Add summary record. All summary records will be printed once the main flow ends.

**ID:** `com.fireblink.fbl.context.summary`

**Aliases:**
 - `fbl.context.summary`
 - `context.summary`
 - `summary`
 
**Example:**

```yaml
summary:
  # summary record title
  title: Step Title
  # summary record status
  # statuses (ignoring case): 
  # - 'created', 'updated', 'passed', 'success', 'ok', 'yes' will be colored in green
  # - 'deleted', 'failed', 'failure', 'error', 'no' - in red
  # - 'ignored', 'skipped', 'none' - in yellow
  # others will have default text color
  status: Failed
  # [optional] human readable duration (string)
  duration: <%- $.duration(1000) %>
  # [optional] additional data associated with record. Not presented in printed table.
  payload: anything
  
```