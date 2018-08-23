# Context manipulation plugin

Various handlers to manipulate context state. 

Available steps:
- context values assignment
- secret values assignment
- marking entities as registered, unregistered, created, updated or deleted

## Context Values Assignment

Assign values to context ("ctx").

ID: com.fireblink.fbl.context.values

Aliases:
 - fbl.context.values
 - context.values
 - context
 - ctx
 
**Example 1: Assign values to context root directly:**

```yaml
ctx: 
  '.': 
    inline:
      something: true
      else: false  
```

**Example 2: Assign values from file "vars.yml" to field "vars.from.file":**

```yaml
ctx: 
  vars.from.file: 
    files: 
     - vars.yml    
```

**Example 3: Assign values from file "vars.yml" after inline ones:**
```yaml
ctx: 
  '.':
    inline: 
      test: true 
    files: 
     - vars.yml 
    # specify that files have a priority over inline vars
    # if not provided inline vars will have priority over files
    priority: 'files'   
```

## Secret Values Assignment

Assign values to secrets ("secrets").

ID: com.fireblink.fbl.secret.values

Aliases:
 - fbl.secret.values
 - secret.values
 - secrets
 - secret
 
**Example 1: Assign values to secrets root directly:**
 
 ```yaml
 secrets: 
   '.': 
     inline:
       something: true
       else: false  
 ```
 
**Example 2: Assign values from file "vars.yml" to field "vars.from.file":**
 
 ```yaml
 secrets: 
   vars.from.file: 
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
     # specify that files have a priority over inline vars
     # if not provided inline vars will have priority over files
     priority: 'files'   
 ```
 
## Mark entities as registered

Mark some entity to exist.

Example use case: you want to keep some default entity upon cleanup.

ID: com.fireblink.fbl.context.entities.registered

Aliases:
 - fbl.context.entities.registered
 - context.entities.registered
 - ctx.entities.registered
 
**Example:**
  
```yaml
ctx.entities.registered: 
    # Object type/class/etc
  - type: User
    # Entity Identity, can be a string or number
    id: 1002
    # Optional payload that may represent other or all fields of the entity
    payload:
      username: foobar        
```

## Mark entities as un-registered

Mark some entity to not exist.

Example use case: you want to force cleanup of some default entity.

ID: com.fireblink.fbl.context.entities.registered

Aliases:
 - fbl.context.entities.unregistered
 - context.entities.unregistered
 - ctx.entities.unregistered
 
**Example:**
  
```yaml
ctx.entities.unregistered: 
    # Object type/class/etc
  - type: User
    # Entity Identity, can be a string or number
    id: 1002
    # Optional payload that may represent other or all fields of the entity
    payload:
      username: foobar        
```

## Mark entities as created

Mark some entity as just created. Will also register entity, so it will be presented in 2 places: `entities.registered` and `entities.created` 

ID: com.fireblink.fbl.context.entities.created

Aliases:
 - fbl.context.entities.created
 - context.entities.created
 - ctx.entities.created
 
**Example:**
  
```yaml
ctx.entities.created: 
    # Object type/class/etc
  - type: User
    # Entity Identity, can be a string or number
    id: 1002
    # Optional payload that may represent other or all fields of the entity
    payload:
      username: foobar        
```

## Mark entities as updated

Mark some entity as just updated. Will also register entity, so it will be presented in 2 places: `entities.registered` and `entities.updated` 

ID: com.fireblink.fbl.context.entities.updated

Aliases:
 - fbl.context.entities.updated
 - context.entities.updated
 - ctx.entities.updated
 
**Example:**
  
```yaml
ctx.entities.created: 
    # Object type/class/etc
  - type: User
    # Entity Identity, can be a string or number
    id: 1002
    # Optional payload that may represent other or all fields of the entity
    payload:
      username: foobar        
```

## Mark entities as deleted

Mark some entity as just deleted. Will also un-register entity, so it will be presented in 2 places: `entities.unregistered` and `entities.deleted` 

ID: com.fireblink.fbl.context.entities.deleted

Aliases:
 - fbl.context.entities.deleted
 - context.entities.deleted
 - ctx.entities.deleted
 
**Example:**
  
```yaml
ctx.entities.deleted: 
    # Object type/class/etc
  - type: User
    # Entity Identity, can be a string or number
    id: 1002
    # Optional payload that may represent other or all fields of the entity
    payload:
      username: foobar        
```