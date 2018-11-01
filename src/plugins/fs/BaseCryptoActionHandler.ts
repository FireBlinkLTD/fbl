import {ActionHandler} from '../../models';
import * as Joi from 'joi';
import {createCipheriv, createDecipheriv, pbkdf2, randomBytes} from 'crypto';
import {createReadStream, createWriteStream, ReadStream, rename} from 'fs';
import {promisify} from 'util';
import {Container} from 'typedi';
import {TempPathsRegistry} from '../../services';

export abstract class BaseCryptoActionHandler extends ActionHandler {
    private static encryptionAlgorithm = 'aes-256-cbc';
    private static hashAlgorithm = 'sha512';
    private static ivSize = 16;
    private static keySize = 32;
    private static saltSize = 24;
    private static version = Buffer.alloc(2, '0001', 'hex');

    private static validationSchema = Joi.object({
            password: Joi.string().required(),
            include: Joi.array()
                .items(Joi.string().min(1).required())
                .min(1)
                .required(),
            exclude: Joi.array()
                .items(Joi.string().min(1).required())
        })
        .required()
        .options({ abortEarly: true });

    getValidationSchema(): Joi.SchemaLike | null {
        return BaseCryptoActionHandler.validationSchema;
    }

    private static async getPasswordHash(password: string, salt?: Buffer): Promise<{hash: Buffer, salt: Buffer}> {
        salt = salt || randomBytes(BaseCryptoActionHandler.saltSize);
        const hash = await promisify(pbkdf2)(password, salt, 100000, BaseCryptoActionHandler.keySize, BaseCryptoActionHandler.hashAlgorithm);

        return {
            salt: salt,
            hash: hash
        };
    }

    protected async encrypt(file: string, password: string): Promise<void> {
        const passwordHash = await BaseCryptoActionHandler.getPasswordHash(password);
        const iv = randomBytes(BaseCryptoActionHandler.ivSize);
        const cipher = createCipheriv(BaseCryptoActionHandler.encryptionAlgorithm, passwordHash.hash, iv);

        const tmpFile = await Container.get(TempPathsRegistry).createTempFile(true);
        const rs = createReadStream(file);
        const ws = createWriteStream(tmpFile);

        const writeAsync = (chunk: Buffer): Promise<void> => {
            return new Promise<void>(resolve => {
                ws.write(chunk, () => resolve());
            });
        };

        await writeAsync(BaseCryptoActionHandler.version);
        await writeAsync(passwordHash.salt);
        await writeAsync(iv);

        await new Promise<void>(resolve => {
            rs.pipe(cipher).pipe(ws);
            rs.on('close', () => {
                ws.end();
                resolve();
            });
        });

        await promisify(rename)(tmpFile, file);
    }

    private static streamToBuffer(stream: ReadStream): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const buffers: Buffer[] = [];
            stream.on('error', reject);
            stream.on('data', (data) => buffers.push(data));
            stream.on('end', () => resolve(Buffer.concat(buffers)));
        });
    }

    protected async decrypt(file: string, password: string): Promise<void> {
        const headerSize = 2 + BaseCryptoActionHandler.saltSize + BaseCryptoActionHandler.ivSize;

        let rs = createReadStream(file, {
            end: headerSize
        });

        const header = await BaseCryptoActionHandler.streamToBuffer(rs);

        const salt = header.slice(2, 2 + BaseCryptoActionHandler.saltSize);
        const iv = header.slice(2 + BaseCryptoActionHandler.saltSize, headerSize);

        rs = createReadStream(file, {
            start: headerSize
        });

        const passwordHash = await BaseCryptoActionHandler.getPasswordHash(password, salt);
        const decipher = createDecipheriv(BaseCryptoActionHandler.encryptionAlgorithm, passwordHash.hash, iv);

        const tmpFile = await Container.get(TempPathsRegistry).createTempFile(true);
        const ws = createWriteStream(tmpFile);

        await new Promise<void>(resolve => {
            rs.pipe(decipher).pipe(ws);
            rs.on('close', () => {
                ws.end();
                resolve();
            });
        });

        await promisify(rename)(tmpFile, file);
    }
}
