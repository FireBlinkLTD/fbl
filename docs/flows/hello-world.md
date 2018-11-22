## Hello World

Create a file called `hello.yml` with following content:

```yaml
pipeline:
  exec:
    command: 'echo'
    args:
      - 'Hello World'
    options:
      verbose: true
```
 
Start the flow with fbl:

```bash
fbl hello.yml
```

You should now similar output in your console:

```
 -> Reading flow file: hello.yml
 -> [1] [exec] Processing.
 -> [1] [exec] stdout: Hello World

 <- [1] [exec] Completed successfully withing 0.037 second
```