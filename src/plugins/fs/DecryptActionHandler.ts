import {ActionSnapshot} from '../../models';
import {IActionHandlerMetadata, IContext, IDelegatedParameters} from '../../interfaces';
import {FSUtil} from '../../utils';
import {BaseCryptoActionHandler} from './BaseCryptoActionHandler';

export class DecryptActionHandler extends BaseCryptoActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'com.fireblink.fbl.fs.decrypt',
        aliases: [
            'fbl.fs.decrypt',
            'fs.decrypt',
            'decrypt'
        ]
    };

    /**
     * @inheritdoc
     */
    getMetadata(): IActionHandlerMetadata {
        return DecryptActionHandler.metadata;
    }

    /**
     * @inheritdoc
     */
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const files = await FSUtil.findFilesByMasks(options.include, options.exclude, snapshot.wd);
        for (const file of files) {
            snapshot.log(`Decrypting ${file}`);
            await this.decrypt(file, options.password);
        }
    }
}
