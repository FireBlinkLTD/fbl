import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {FSUtil} from '../../utils';
import {BaseCryptoActionHandler} from './BaseCryptoActionHandler';

export class EncryptActionHandler extends BaseCryptoActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.fs.encrypt',
        aliases: [
            'fbl.fs.encrypt',
            'fs.encrypt',
            'encrypt'
        ]
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return EncryptActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const files = await FSUtil.findFilesByMasks(options.include, options.exclude, snapshot.wd);
        for (const file of files) {
            snapshot.log(`Encrypting ${file}`);
            await this.encrypt(file, options.password);
        }
    }
}
