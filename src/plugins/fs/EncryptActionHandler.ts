import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import {FSUtil} from '../../utils';
import {BaseCryptoActionHandler} from './BaseCryptoActionHandler';

const version = require('../../../../package.json').version;

export class EncryptActionHandler extends BaseCryptoActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.fs.encrypt',
        version: version,
        aliases: [
            'fbl.fs.encrypt',
            'fs.encrypt',
            'encrypt'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return EncryptActionHandler.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const files = await FSUtil.findFilesByMasks(options.include, options.exclude, snapshot.wd);
        for (const file of files) {
            snapshot.log(`Encrypting ${file}`);
            await this.encrypt(file, options.password);
        }
    }
}
