import { globP } from '../util/globP.js';
import { compressFile } from './compressFiles.js';

// cspell:ignore nodir

export async function gzip(globs: string[]): Promise<void> {
    const files = await globP(globs, { nodir: true });
    for (const fileName of files) {
        await compressFile(fileName);
    }
}
