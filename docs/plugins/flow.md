# Flow control plugin

Flow order control.

Available actions:

- [sequence \(sync\)](flow.md#action-handler-sequential-steps-execution) - execute sub-flows in a sequence
- [parallel \(async\)](flow.md#action-handler-parallel-steps-execution) - execute sub-flows in parallel
- [attachment](flow.md#action-handler-attached-flow) - execute flow described in different file / url
- [repeat](flow.md#action-handler-repeat-flow) - repeat action multiple times
- [retry](flow.md#action-handler-retry-flow) - repeat action till it succeeds or fails maximum number of times
- [for each of](flow.md#action-handler-for-each) - execute action for each item in the array
- [while](flow.md#action-handler-while) - execute action while condition satisfies
- [switch \(conditional\)](flow.md#action-handler-switch-flow) - execute different actions based on the value
- [try-catch-finally](flow.md#action-handler-try---catch---finally-flow) - "try / catch / finally"
- [sleep](flow.md#action-handler-sleep) - sleep for given amount of second
- [template](flow.md#action-handler-template) - execute action described in template string
- [virtual](flow.md#action-handler-virtual) - create virtual action handler
- [error](flow.md#action-handler-error) - rise error
- [echo](flow.md#action-handler-echo) - print message to stdout
- [void](flow.md#action-handler-void) - does nothing

## Action Handler: Sequential steps execution

Run steps one by one, if any of steps fail - chain of execution will stop on it.

Note: [parameters](../GLOSSARY.md#parameters) for each action will be cloned. Meaning each action will start its own `branch` unless `shareParameters` option is used.

**ID:** `com.fireblink.fbl.flow.sequence`

**Aliases:**

- `fbl.flow.sequence`
- `flow.sequence`
- `sequence`
- `sync`
- `--`

**Example 1: Base Declaration**

```yaml
# Run actions in a sequence
'--':
  - ctx:
      '.':
        inline:
          something: true
  - ctx:
      fromFile:
        files:
          - test.yml
```

**Example 2: Detailed Declaration**

```yaml
# Run actions in a sequence
'--':
  # [optional] whether to share parameters between actions instead of making a clone.
  # Default value: false, e.g. make cloned parameters for each action in a sequence.
  shareParameters: false

  # [required] list of actions to invoke in a sequence
  actions:
    - ctx:
        '.':
          inline:
            something: true
    - ctx:
        fromFile:
          files:
            - test.yml
```

**Warning:** `shareParameters` usage is considered an [anti-pattern](../pitfalls/sequence-share-parameters.md)

## Action Handler: Parallel steps execution

Run all steps in parallel. If any of steps will fail - it will not affect others. However parallel step itself will be marked as failed.

**ID:** `com.fireblink.fbl.flow.parallel`

**Aliases:**

- `fbl.flow.parallel`
- `flow.parallel`
- `parallel`
- `async`
- `||`

**Example 1: Base syntax**

```yaml
# Run steps in parallel
'||':
  - ctx:
      '.':
        inline:
          something: true
  - ctx:
      fromFile:
        files:
          - test.yml
```

**Example 2: Alternative syntax**

```yaml
'||':
  # [optional] whether to share parameters between actions instead of making a clone.
  # Default value: false, e.g. make cloned parameters for each action in a sequence.
  shareParameters: false

  # [required] actions to invoke in parallel
  actions:
    - ctx:
      '.':
        inline:
          something: true
    - ctx:
      fromFile:
        files:
          - test.yml
```

## Action Handler: Attached flow

Allows to reference external flow by its pass. Helps to logically split big flows for better organized structure.

**ID:** `com.fireblink.fbl.flow.attachment`

**Aliases:**

- `fbl.flow.attachment`
- `flow.attachment`
- `attachment`
- `@`

**Example 1: Specify flow file**

```yaml
# Run steps from external flow file or package (*.tar.gz)
'@': flow.yml
```

**Example 2: Specify directory**

```yaml
# Run steps from external flow file (index.yml) inside "flow" directory
# Note: slash in the end of path is not required
'@': flow/
```

**Example 3: Specify url to download a package**

```yaml
# Run steps from external flow file (index.yml) inside "flow" directory
# Note: slash in the end of path is not required
'@': http://some.host/flow.tar.gz
```

**Example 4: Specify target inside the package**

```yaml
'@':
  # [required] path or url to download the package
  path: flow.tar.gz
  # [optional] specify custom flow entry file name inside the package
  target: custom.yml
```

**Example 5: Custom HTTP headers**

```yaml
'@':
  # [required] path or url to download the package
  path: http://some.host/flow.tar.gz

  # [optional] specify custom flow entry file name inside the package
  target: custom.yml

  # [optional] http parameters
  http:
    # [optional] custom http headers
    headers:
      Authorization: Basic YWRtaW46YWRtaW4=

  # [optional] cache downloaded package inside $FBL_HOME/cache folder
  cache: true
```

## Action Handler: Repeat flow

Repeat action multiple times.

**ID:** `com.fireblink.fbl.flow.repeat`

**Aliases:**

- `fbl.flow.repeat`
- `flow.repeat`
- `repeat`

**Example:**

```yaml
repeat:
  # [optional] whether to share parameters between actions instead of making a clone.
  # Default value: false, e.g. make cloned parameters for each action in a sequence.
  shareParameters: false

  # [required] number of iterations
  times: 2

  # [optional] whether each iteration should wait previous to complete or run in parallel
  # Default value: false
  async: false

  # [required] action to run
  action:
    # run flow_0.yml and flow_1.yml flows
    @: flow_<%- iteration.index %>.yml
```

## Action Handler: Retry flow

Retry action multiple times till it passes or reach max failure attempts.

**ID:** `com.fireblink.fbl.flow.retry`

**Aliases:**

- `fbl.flow.retry`
- `flow.retry`
- `retry`

**Example:**

```yaml
retry:
  # [required] number of attempts to run the action
  attempts: 2

  # [required] action to run
  action:
    sleep: 1

  # [optional] allows to record last error code from last failed attempt
  # Note: will only be executed if all attempts are failed
  errorCode:
    # [optional] assign error code to context field
    # Follows common assignment logic practicies https://fbl.fireblink.com/plugins/common#assign-to
    assignTo: '$.ctx.errorCode'

    # [optional] push error code to context field
    # Follows common push logic practicies https://fbl.fireblink.com/plugins/common#push-to
    pushTo: '$.ctx.errorCode'
```

## Action Handler: For Each

Allows to execute action for every item in the array or key of an object.

**ID:** `com.fireblink.fbl.flow.foreach`

**Aliases:**

- `fbl.flow.foreach`
- `flow.foreach`
- `foreach`
- `each`

**Example: Array**

```yaml
each:
  # [optional] whether to share parameters between actions instead of making a clone of parameters.
  # Default value: false, e.g. make cloned parameters for each action in a sequence.
  shareParameters: false

  # [required] array to iterate over
  of: [1, 2, 3]

  # [required] action to invoke on every iteration
  action:
    ctx:
      test_<%- iteration.index %>:
        # assign 1,2,3 to test_0, test_1, test_3
        inline: $ref:iteration.value
```

**Example: Object**

```yaml
each:
  # [optional] whether to share parameters between actions instead of making a clone of parameters.
  # Default value: false, e.g. make cloned parameters for each action in a sequence.
  shareParameters: false

  # [required] object to iterate over
  of:
    a: 1
    b: 2

  # [required] action to invoke for each iteration
  action:
    ctx:
      test_<%- iteration.index %>:
        # assign 1a to test_0 and b2 to test_1 values
        inline: <%- iteration.value %><%- iteration.name %>
```

## Action Handler: Switch flow

Allows to run action based on some condition

**ID:** `com.fireblink.fbl.flow.switch`

**Aliases:**

- `fbl.flow.switch`
- `flow.switch`
- `switch`
- `if`
- `?`

**Example:**

```yaml
'?':
  # [required] value to check
  value: <% ctx.test %>

  # [requied] actions to run on specific value
  is:
    # execute "foo.yml" if "foo"
    foo:
      @: foo.yml

    # execute "bar.yml" if "bar"
    bar:
      @: bar.yml

  # [optional] if no match found "else" handler will get executed
  else:
    @: else.yml
```

## Action Handler: While

Runs action till condition is successful or not \(based on configuration\).

**ID:** `com.fireblink.fbl.flow.while`

**Aliases:**

- `fbl.flow.while`
- `flow.while`
- `while`

**Example: Positive condition check**

```yaml
while:
  # [optional] whether to share parameters between actions instead of making a clone of parameters.
  # Default value: false, e.g. make cloned parameters for each action in a sequence.
  shareParameters: false

  # [required] value to check
  value: <%- ctx.something %>

  # [required] if value IS equal to provided one - action will get executed
  is: true

  # [required] action to run
  action:
    '@': something.yml
```

**Example: Negative condition check**

```yaml
while:
  # [optional] whether to share parameters between actions instead of making a clone of parameters.
  # Default value: false, e.g. make cloned parameters for each action in a sequence.
  shareParameters: false

  # [required] value to check
  value: <%- ctx.something %>

  # [required] if value IS NOT equal to provided one - action will get executed
  not: true

  # [required] action to run
  action:
    '@': something.yml
```

## Action Handler: Sleep

Sleep for a given amount of seconds.

**ID:** `com.fireblink.fbl.flow.sleep`

**Aliases:**

- `fbl.flow.sleep`
- `flow.sleep`
- `sleep`

**Example:**

```yaml
# sleep for a minute
sleep: 60
```

## Action Handler: Try - Catch - Finally Flow

Allows to run sub-step in isolation causing its failure to be ignored by parent step. Optionally catch and finally steps can be invoked.

If catch or finally step block will be failed - this step will also be marked as failed even try block passes successfully.

**ID:** `com.fireblink.fbl.flow.try`

**Aliases:**

- `fbl.flow.try`
- `flow.try`
- `try`

**Example:**

```yaml
try:
  # [required] action to run
  action:
    @: foo.yml

  # [optional] call error.yml if foo.yml failed
  catch:
    @: error.yml

  # [optional] error code assignment, can be used to better handle error processing inside catch/final actions
  errorCode:
    # [optional] assign error code to context field
    # Follows common assignment logic practicies https://fbl.fireblink.com/plugins/common#assign-to
    assignTo: '$.ctx.errorCode'

    # [optional] push error code to context field
    # Follows common push logic practicies https://fbl.fireblink.com/plugins/common#push-to
    pushTo: '$.ctx.errorCode'

  # [optional] call cleanup.yml either after successful execution of foo.yml or error.yml
  finally:
    @: cleanup.yml
```

## Action Handler: Template

Run action based on dynamically constructed template. This is handy as you generally can not dynamically construct YAML with EJS template inside most of the actions.

E.g: following is invalid:

```yaml
ctx:
  something: <% [1, 2, 3].forEach(item => { %>
    - <%- item %>
    <% }) %>
```

It will fail as upon processing everything that goes after something will be treated as string, causing to produce following action:

```yaml
ctx:
  something: '-1\n -2\n -3'
```

But there is a template handler that can help you with that.

**ID:** `com.fireblink.fbl.flow.template`

**Aliases:**

- `fbl.flow.template`
- `flow.template`
- `template`
- `tpl`

**Example:**

```yaml
tpl: |-
  ctx:
    something: 
      <% [1, 2, 3].forEach(item => { %>
      - <%- item %>
      <% }) %>
```

that will generally produce:

```yaml
ctx:
  something: [1, 2, 3]
```

## Action Handler: Virtual

Allows to create virtual action handler for another action \(that can be represented as one of the flows\).

**ID:** `com.fireblink.fbl.flow.virtual`

**Aliases:**

- `fbl.flow.virtual`
- `flow.virtual`
- `virtual`

**Example:**

```yaml
virtual:
  # [required] virtual handler ID
  id: handler.id

  # [optional] aliases for the handler to reference
  aliases:
    - handler.alias

  # [optional] JSON Schema of options that can/should be passed to the generated handler
  parametersSchema:
    type: object
    properties:
      test:
        type: string

  # [optional] default parameters and merge function
  # Note: if no mergeFunction or modifiers is provided defaults with parameters will be deeply merged.
  # Upon merge arrays will be concatenated.
  defaults:
    # [required] default values
    values:
      test: yes

    # [optional] merge modification functions for given paths
    # This is a recommended way of overriding merge behaviour.
    # Use "mergeFunction" only when you need to do something really unique.
    # "parameters" - represents field state by given path
    # "defaults" - its default value if any
    modifiers:
      $.test: |-
        return parameters + defaults

    # [optional] custom merge function
    # Use it only when "modifiers" functionality isn't enough
    # "parameters" - represents provided parameters
    # "defaults" - defaults by itself
    mergeFunction: |-
      return parameters.test + defaults.test

  # [optional] Change working directory location based on the place of virtual execution
  #  instead of declaration.
  #
  # By default all relative paths are resolved based on the place where virtual action is declared.
  # If you need to change the behavior - set this property to "true".
  #
  # Parameters:
  #   $.parameters.wd  - will be dynamically set to either working directory where virtual
  #                      is declared or place where it will be invoked.
  #
  #   $.parameters.pwd - always points to the working directory where virtual was declared.
  dynamicWorkDir: true

  # [required] action to invoke
  action:
    ctx:
      some_field:
        # Note: you may use "parameters" to reference passed options to the virtual handler
        # These options are first pre-validated with provided validationSchema (if any)
        inline: <%- parameters.test %>
```

Then you can reference your generated handler like any other:

```yaml
handler.id:
  test: some_field_value
```

## Action Handler: Invoke

Allows to execute action passed as parameter. Can be used in pair with `virtual` to pass flow actions as parameters and create reach execution flow patterns.

**ID:** `com.fireblink.fbl.flow.invoke`

**Aliases:**

- `fbl.flow.invoke`
- `flow.invoke`
- `invoke`

**Example:**

```yaml
# Invoke action described in parameters `action` field
invoke: $ref:parameters.action
```

## Action Handler: Error

Throw error upon execution with given message.

**ID:** `com.fireblink.fbl.flow.error`

**Aliases:**

- `fbl.flow.error`
- `flow.error`
- `error`

**Example:**

```yaml
error: 'message'
```

## Action Handler: Echo

Print message to console

**ID:** `com.fireblink.fbl.flow.echo`

**Aliases:**

- `fbl.flow.echo`
- `flow.echo`
- `echo`

**Example:**

```yaml
echo: 'message'
```

## Action Handler: Void

Action handler that does nothing. Main usecase to bypass limitations of other action handlers that require action handler to be provided as an option, but you might not want to do that for some reason.

**ID:** `com.fireblink.fbl.flow.void`

**Aliases:**

- `fbl.flow.void`
- `flow.void`
- `void`

**Example:**

```yaml
pipeline:
  '--':
    - void
```
