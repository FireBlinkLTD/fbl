# Action Metadata fields

Metadata fields are used to provide additional information for FBL to change the action execution behavior. 

Metadata fields are located on the same level as the action ID or alias and should always start with `$` character. E.g.:

```yaml
pipeline:
  $title: Assign 'value' to ctx.field
  ctx:
    '$.field':
      inline: 'value'
```

## $title

Title is used to make `--verbose` output more meaningful for the user. Instead of printing action ID or alias FBL will use the text inside the `$title` meta field.

## $parameters

Used to assign additional, provide initial or merge with existing parameters before running the action.

```yaml
pipeline:
  # provide parameters.test value right to the action
  $parameters: 
    test: true
  ctx:
    '$.field':
      # reference parameters field provided inside the metadata
      inline: $ref:parameters.test
```