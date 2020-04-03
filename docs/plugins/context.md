# Context manipulation plugin

Upon flow execution each action handler gets access to shared [context](../GLOSSARY.md#context).

[EJS](http://ejs.co/) template can be used inside options to pass values from shared context.
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

Available steps:

- [ctx](context.md#action-handler-context-values-assignment) - assign values to "ctx"
- [secret](context.md#action-handler-secret-values-assignment) - assign values to "secret"
- [summary](context.md#action-handler-summary) - report in the end of fbl execution

## Action Handler: Context Values Assignment

Assign non-secret values to context `ctx` field or its child properties by [path](../GLOSSARY.md#path). General use case: register shared non-sensitive options that later will be used by actions.

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

**Example 2: Assign values from file "vars.yml" to field "vars -&gt; files":**

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
    # [required] if you want to push inline or value(s) from file(s) to targets array
    push: true
    # [optional] if enambled and value is array its child items will be pushed instead of array itself
    children: false
```

**Example 6: Find files by mask:**

```yaml
ctx:
  '$':
    files:
      - vars/*.yml
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

**Example 2: Assign values from file "vars.yml" to field "vars -&gt; files":**

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
    # [required] if you want to push inline or value(s) from file(s) to target's array
    push: true
    # [optional] if enambled and value is array its child items will be pushed instead of array itself
    children: false
```

**Example 6: Find files by mask:**

```yaml
secrets:
  '$':
    files:
      - vars/*.yml
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
