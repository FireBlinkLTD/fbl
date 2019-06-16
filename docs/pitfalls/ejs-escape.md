# EJS Escape Syntax

In most cases FBL handles well escaping strings for you to provide a valid YAML, however there are cases when we simply can't, like this:

```yaml
value: <%- $.require('path').dirname('@fancy/file.yml`) %>
```

The example above will fail as it will transform into:

```yaml
value: @fancy
```

`@` is a reserved symbol and yaml above is simply not valid, so in order to fix that you should use escape syntax `<%= %>`:

```yaml
value: <%= $.require('path').dirname('@fancy/file.yml`) %>
```
