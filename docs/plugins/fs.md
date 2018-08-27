# File System Plugin

File System plugin.

## Action Handler: Write to specific file

ID: com.fireblink.fbl.fs.file.write

Aliases:
 - fbl.fs.file.write
 - fs.file.write
 - file.write
 - \->
 
**Example:**

```yaml
->: 
  # File path, make sure parent dirs exists
  path: /tmp/test.txt
  # Content of the file
  content: |-
    test content
``` 

## Action Handler: Write to temp file

ID: com.fireblink.fbl.fs.temp.file.write

Aliases:
 - fbl.fs.temp.file.write
 - fs.temp.file.write
 - temp.file.write
 - tmp.->
 
**Example:**
 
```yaml
tmp.->: 
  # "ctx" variable name that will host the path to temp file,
  # e.g: ctx.test in this case will host it
  context: test
  # Content of the file
  content: |-
    test content
``` 
 
## Action Handler: Encrypt files
 
Encrypt files by mask with aes-256-cbc and password converted with pbkdf2 algorithm into sha512 hash.

ID: com.fireblink.fbl.fs.encrypt

Aliases:
 - fbl.fs.encrypt
 - fs.encrypt
 - encrypt
 
**Example:**

```yaml
encrypt:
    # Password used to encrypt files
    # Warning: don't reference it directly, better place in "secrets", as in report it will be masked.    
    password: <%- secrets.password %>
    # List of masks to find files to be encrypted
    inlude:
      - /tmp/*.*      
    # List of masks to exclude
    exclude:
      - /tmp/*.log
```

## Action Handler: Decrypt files

Same as above, but instead of encryption will decrypt files.

ID: com.fireblink.fbl.fs.decrypt

Aliases:
 - fbl.fs.decrypt
 - fs.decrypt
 - decrypt
 
**Example:**

```yaml
encrypt:
    # Password used to decrypt files
    # Warning: don't reference it directly, better place in "secrets", as in report it will be masked.    
    password: <%- secrets.password %>
    # List of masks to find files to be decrypted
    inlude:
      - /tmp/*.*      
    # List of masks to exclude
    exclude:
      - /tmp/*.log    
```