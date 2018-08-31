# Flow control plugin

Flow order control.

Available steps:
- sequence (sync)
- parallel (async)
- attachment (external sub-flow file)
- switch (conditional)
- try-catch-finally
- repeat (async and sync)
- foreach (async and sync)
- based on template

## Action Handler: Sequential steps execution

Run steps one by one, if any of steps fail - chain of execution will stop on it.

ID: com.fireblink.fbl.flow.sequence

Aliases:
 - fbl.flow.sequence
 - flow.sequence
 - sequence
 - sync
 - \--

**Example:**

```yaml
# Run steps in a sequence
--:
  - ctx:
      '.':
        inline: 
          something: true
  - ctx: 
      fromFile:
        files: 
          - test.yml 
```

## Action Handler: Parallel steps execution

Run all steps in parallel. If any of steps will fail - it will not affect others. However parallel step itself will be marked as failed.

ID: com.fireblink.fbl.flow.parallel

Aliases:
 - fbl.flow.parallel
 - flow.parallel
 - parallel
 - async
 - ||
 
**Example:** 
 
```yaml
# Run steps in parallel
||:
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

ID: com.fireblink.fbl.flow.attachment

Aliases:
 - fbl.flow.attachment
 - flow.attachment
 - attachment
 - @
 
**Example:**

```yaml
# Run steps from external flow file
@: flow.yml 
```

## Action Handler: Repeat flow

Repeat action multiple times.

ID: com.fireblink.fbl.flow.repeat

Aliases:
 - fbl.flow.repeat
 - flow.repeat
 - repeat

**Example:**

```yaml
repeat:
  # number of iteration
  times: 2
  # whether each iteration should wait previous to complete or run in parallel
  async: false
  # action to run
  action: 
    # run flow_0.yml and flow_1.yml flows
    @: flow_<%- iteration.index %>.yml                 
```

## Action Handler: Switch flow

Allows to run action based on some condition

ID: com.fireblink.fbl.flow.switch

Aliases:
 - fbl.flow.switch
 - flow.switch
 - switch
 - if
 - ? 
 
**Example:**

```yaml
?: 
  # check if context value "test" is one of provided values
  value: <% ctx.test %>
  is:
    # execute "foo.yml" if "foo"
    foo: 
      @: foo.yml
      
    # execute "bar.yml" if "bar"
    bar: 
      @: bar.yml
```

## Action Handler: Try - Catch - Finally Flow

Allows to run sub-step in isolation causing its failure to be ignored by parent step.
Optionally catch and finally steps can be invoked.

If catch or finally step block will be failed - this step will also be marked as failed even try block passes successfully.

ID: com.fireblink.fbl.flow.try

Aliases:
 - fbl.flow.try
 - flow.try
 - try
 
**Example:**

```yaml
try:
    action:
      @: foo.yml
    catch:
      @: error.yml
    finally:
      @: cleanup.yml
```

## Action Handler: For Each

Allows to execute action for every item in the array or key of an object.

ID: com.fireblink.fbl.flow.foreach

Aliases:
 - fbl.flow.foreach
 - flow.foreach
 - foreach
 - each
 
**Example:**

```yaml
each:  
  of: [1, 2, 3]
  action:
    ctx: 
      test_<%- iteration.index %>: 
        inline: <%- iteration.value %>
```

## Action Handler: Template

Run action based on dynamically constructed template. This is handy as you generally can not dynamically construct YAML with EJS template inside most of the actions. 

E.g: following is invalid:

```yaml
ctx:
  something: 
    <% [1, 2, 3].forEach(item => { %>
    - <%- item %>
    <% }) %>    
```

It will fail as upon processing everything that goes after something will be treated as string, causing to produce following action:

```yaml
ctx:
  something: '-1\n -2\n -3' 
```

But there is a template handler that can help you with that.

ID: com.fireblink.fbl.flow.template

Aliases:
 - fbl.flow.template
 - flow.template
 - template
 - tpl
 
**Example:**

```yaml
tpl: |-
  ctx:
    something: 
      <% [1, 2, 3].forEach(item => { %>
      - <%- item %>
      <% }) %>    
```

or the same with helper function that converts anything to JSON string (JSON is a valid YAML):

```yaml
tpl: |-
  ctx:
    something: <%- $.toJSON([1, 2, 3]) %> 
```

that will generally produce:

```yaml
ctx:
  something: [1, 2, 3]
```