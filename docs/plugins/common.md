# Common Action Handlers Options

This section contains common definitions for action handlers.

## Assign To

Commonly used to assign action results to context fields.

**Example 1: Direct assignment**

Allow to assign value directly to 

```yaml
# assign value to context's `ctx` field `target`
# <assignTo> is action specific name and may generally can be either simply `assignTo` or more descrete `assignSomethingTo` 
'<assignTo>': $.ctx.target
```

Short name syntax accepts a [path](../GLOSSARY.md#path) to context field. 

When path assignment targets [context](context.md) following rules are applied:
Value assignment is only possible to `ctx`, `secrets` or `parameters`.

**Example 2: Multi assignment**

Then example above can also be written in the following way:

```yaml
'<assignTo>': 
  ctx: $.target
```

The main advantage of this alternative syntax is the ability to assign to multiple values and override the entire target object.

Let's say we want to save value into both `ctx` and `parameters`, we can leverage that with:

```yaml
'<assignTo>': 
  ctx: $.target
  parameters: $.paramsTarget
```

Another example is with field override functionality.

Let assume we currently have the following context state:

```yaml
ctx:
  something:
    a: 1
    b: 2
```
and we want to assign to `ctx.something` entirell new object:

```yaml
'<assignTo>': 
  ctx: '$.something'
  # if override is not provided assigned value and existing will be merged
  override: true
```

## Push To

Another common usecase is to push some value into array.

```yaml
# push some value to `ctx.something` field array
# if field is missing - it will be created with array and one pushed element in it 
'<pushTo>': '$.ctx.something'
```

Similar to `assignTo` functionality `pushTo` can push values into multiple targets, override original value.

But additionally to that there is one more option that works only when pushed value is array - pushing its items to the target array instead of the array itself:

```yaml
'<pushTo>':
  ctx: '$.target'
  # if children option is passed value's array items will be pushed to `target` array instead of pushing value itself
  children: true
```