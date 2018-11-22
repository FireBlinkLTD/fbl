# Tarball (packaging)

Sharing the flow is one of the critical aspects of complex automation tasks. Imagine you created a deployment flow for one of your services.
But now you need to deploy it to another environment. Of course, you can just copy and paste your flow, but any fixes or changes will be hard to sync.

Package it. Any flow can be easily packaged and imported in other flow or invoked directly via local path or even URL.

Requirements:
- File extension should be either `.tar.gz` or `.tgz`.
- `index.yml` file should be located in root of the tarball or in any child directory if each parent dir has only one child.

## Package usage

You can reference tarball as any other flow by just providing path to it, e.g.:

`fbl path/to/flow.tar.gz`

or inside the flow:

```yaml
version: 1.0.0
pipeline:
  '--':
    # reference the flow stored locally
    - '@': path/to/flow.tar.gz
    # reference the flow stored remotely
    - '@': http://storage.com/another_flow.tar.gz
```

## Packaging - Tarball Creation

### Unix

Let's assume your flow is located in folder called `~/flows/sample`

To create a tarball just navigate to flow's parent directory (`flows` in this example) and execute following command:  

```bash
# create a package named sample.tar.gz with all the files inside sample folder 
tar czf sample.tar.gz sample
```

