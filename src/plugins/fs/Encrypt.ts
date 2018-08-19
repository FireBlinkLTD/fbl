import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import {BaseCrypto} from './BaseCrypto';

export class Encrypt extends BaseCrypto {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.encrypt',
        version: '1.0.0',
        description: 'Encrypt files',
        aliases: [
            'fbl.encrypt',
            'encrypt'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return Encrypt.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const files = await this.findFilesByMasks(options.include, options.exclude, snapshot.wd);
        for (const file of files) {
            await this.encrypt(file, options.password);
        }
    }
}
