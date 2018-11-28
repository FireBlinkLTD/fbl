# Glossary

FBL specific terms and their definitions.

## Action handler

Any action that one can use in his/her flow is served by Node.js plugin with one or more associated ActionHandler classes.

In the flow file action handler can be referenced via its ID or one of the specified aliases.

## Context

Every action has access to the shared object that is called `context`.

FBL Context has a following format:

```yaml
# directory path from where fbl command was executed
cwd: string

# non-secret values storage
ctx:
  key: value 

# secret values storage  
secrets:
   key: secret

# saved, removed, edited 
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

## Flow

One or more actions combined into together with defined order of execution.

## Template

Dynamic value processing and assignment inside the flow is handled by EJS template.

## Path

FBL uses its own concept of referencing paths to read from and write to context fields. And generally have a following look `$.parent.child`.

Rules:
* Path should always start with `$`.
* `$` defines root field. It can be either context or some other target based on the context of usage.
* `.` is used to define relationship between parent and child fields. Where parent is always goes first.
* Path should be read from left to right. Where left represent parent fields and right - their nested ones.
* Path can not reference array elements. Path traveling is only possible to the deepest nested object or first found field with basic type value (number, boolean, string) or array.

## Parameters

Parameters is additional shared object like [context](#context), but it is not shared across all actions, but only with ones where parameters are defined and all nested ones (if any). 
Generally parameters are used to isolate specific values from global scope.

## Plugin

Embedded or external Node.js module that has specific structure and exposes action handlers, template utility functions or custom reporters.
