import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext} from '../../interfaces';
import {BaseCrypto} from './BaseCrypto';

export class Decrypt extends BaseCrypto {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.decrypt',
        version: '1.0.0',
        description: 'Decrypt files',
        aliases: [
            'fbl.decrypt',
            'decrypt'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return Decrypt.metadata;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const files = await this.findFilesByMasks(options.include, options.exclude, snapshot.wd);
        for (const file of files) {
            await this.decrypt(file, options.password);
        }
    }
}
