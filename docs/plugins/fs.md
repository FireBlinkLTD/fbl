# File System Plugin

File System plugin.

## Action Handler: Write to file

**ID:** `com.fireblink.fbl.fs.file.write`

**Aliases:**

* `fbl.fs.file.write`
* `fs.file.write`
* `file.write`
* `->`

**Example 1: Define File Content Inline**

```yaml
->: 
  # [optional] file path, if not provided content will be written to temporary location directory.
  # Note: all missing parent directories will be automatically created
  path: /tmp/test.txt

  # [optional] 
  # Note: required if "path" (above) and "assignPathTo" (below) is not provided.
  assignPathTo:
    # [optional] "ctx" variable name to assign file path to ("test")
    ctx: '$.test'
    # [optional] "secrets" variable name to assign file path to ("test")
    secrets: '$.test'
    # [optional] "parameters" variable name to assign file path to ("test")
    parameters: '$.test'

  # [optional] 
  # Note: required if "path" and "assignPathTo" (above) is not provided
  pushPathTo:
    # [optional] "ctx" variable name to assign file path to ("test")
    ctx: '$.test'
    # [optional] "secrets" variable name to assign file path to ("test")
    secrets: '$.test'
    # [optional] "parameters" variable name to assign file path to ("test")
    parameters: '$.test'
    # [optional] clear array by given path before assignment
    override: true  

  # [required] content of the file
  content: |-
    test content
```

**Example 2: Define File Content From Other File**

```yaml
->: 
  # [optional] file path, if not provided content will be written to temporary location directory.
  # Note: all missing parent directories will be automatically created
  path: /tmp/test.txt

  # [optional] 
  # Note: required if "path" (above) and "assignPathTo" (below) is not provided.
  assignPathTo:
    # [optional] "ctx" variable name to assign file path to ("test")
    ctx: '$.test'
    # [optional] "secrets" variable name to assign file path to ("test")
    secrets: '$.test'
    # [optional] "parameters" variable name to assign file path to ("test")
    parameters: '$.test'

  # [optional] 
  # Note: required if "path" and "assignPathTo" (above) is not provided
  pushPathTo:
    # [optional] "ctx" variable name to assign file path to ("test")
    ctx: '$.test'
    # [optional] "secrets" variable name to assign file path to ("test")
    secrets: '$.test'
    # [optional] "parameters" variable name to assign file path to ("test")
    parameters: '$.test'

  # [required] template file
  # Note: global and then local EJS template processing will be applied to the template before writing
  contentFromFile: /tmp/template.ejs
```

## Action Handler: Encrypt files

Encrypt files by mask with aes-256-cbc and password converted with pbkdf2 algorithm into sha512 hash.

**ID:** `com.fireblink.fbl.fs.encrypt`

**Aliases:**

* `fbl.fs.encrypt`
* `fs.encrypt`
* `encrypt`

**Example:**

```yaml
encrypt:
  # [required] password used to encrypt files
  # Warning: don't reference it directly, better place in "secrets", as in report it will be masked.    
  password: <%- secrets.password %>

  # [required] list of masks to find files to be encrypted
  inlude:
  - /tmp/*.*      

  # [optional] list of masks to exclude
  exclude:
    - /tmp/*.log
```

## Action Handler: Decrypt files

Same as above, but instead of encryption will decrypt files.

**ID:** `com.fireblink.fbl.fs.decrypt`

**Aliases:**

* `fbl.fs.decrypt`
* `fs.decrypt`
* `decrypt`

**Example:**

```yaml
decrypt:
  # [required] password used to decrypt files
  # Warning: don't reference it directly, better place in "secrets", as in report it will be masked.    
  password: <%- secrets.password %>

  # [required] list of masks to find files to be decrypted
  inlude:
    - /tmp/*.*      

  # [optional] list of masks to exclude
  exclude:
    - /tmp/*.log
```

## Action Handler: Create Directories

Create directory \(and all parent ones if missing\).

**ID:** `com.fireblink.fbl.fs.dir.create`

**Aliases:**

* `fbl.fs.dir.create`
* `fs.dir.create`
* `dir.create`
* `mkdir -p`
* `mkdir`

**Example:**

```yaml
# create "child" directory
# if "parent" is missing it will be also created
mkdir: /tmp/parent/child
```

## Action Handler: Remove File or Folder

Removes file or folder for given path.

**ID:** `com.fireblink.fbl.fs.remove`

**Aliases:**

* `fbl.fs.remove`
* `fbl.fs.rm`
* `fs.remove`
* `fs.rm`
* `rm -rf`
* `remove`
* `rm`

```yaml
# remove "child"
mkdir: /tmp/parent/child
```

## Action Handler: Move File or Folder

Allows to move/rename file or entire folder.

**ID:** `com.fireblink.fbl.fs.move`

**Aliases:**

* `fbl.fs.move`
* `fbl.fs.mv`
* `fs.move`
* `fs.mv`
* `move`
* `mv`

**Example 1: Move file to other folder**

```yaml
mv: 
  # move file.txt
  from: /tmp/source/file.txt

  # to "target" folder
  # note: slash in the end is required if you want to specify a target folder
  to: /tmp/target/
```

**Example 2: Move file to other folder and rename it**

```yaml
mv: 
  # move file.txt
  from: /tmp/source/file.txt

  # to "target" folder and rename it to "renamed.txt"
  to: /tmp/target/renamed.txt
```

**Example 3: Move folder contents to other folder**

```yaml
mv: 
  # move everything from "source" folder
  # note: slash in the end is required if you want to move folder contents rather then the folder itself
  from: /tmp/source/

  # to "target"
  to: /tmp/target
```

## Action Handler: Copy File or Folder

Allows to copy file or entire folder.

**ID:** `com.fireblink.fbl.fs.copy`

**Aliases:**

* `fbl.fs.copy`
* `fbl.fs.cp`
* `fs.copy`
* `fs.cp`
* `copy`
* `cp`

**Example 1: Copy file to other folder**

```yaml
cp: 
  # copy file.txt
  from: /tmp/source/file.txt

  # to "target" folder
  # note: slash in the end is required if you want to specify a target folder
  to: /tmp/target/
```

**Example 2: Copy file to other folder with different name**

```yaml
cp: 
  # copy file.txt
  from: /tmp/source/file.txt

  # to "target" folder and name it "renamed.txt"
  to: /tmp/target/renamed.txt
```

**Example 3: Copy folder contents to other folder**

```yaml
cp: 
  # copy everything from "source" folder
  # note: slash in the end is required if you want to copy folder contents rather then the folder itself
  from: /tmp/source/

  # to "target"
  to: /tmp/target
```

