import fs from 'fs';

const root_path_of_mvs = 'C:/Users/tzz53/Documents/MVSGaussian';

const video_names = fs.readdirSync('./vid-batch');
const video_paths = video_names.map(p => `./vid-batch/${p}`);

const final: string[] = [];
for(let i = 0; i < video_paths.length; i++){
    const id = video_paths[i].split('/').at(-1)!.split('.')[0];
    const mvsgs_scene_folder = `${root_path_of_mvs}/examples/scene_vid_${id}`;

    if(!fs.existsSync(`${mvsgs_scene_folder}/poses_bounds.npy`)){
        console.log(id);
        fs.rmSync(mvsgs_scene_folder, { recursive: true, force: true });
    } else {
        final.push(`scene_vid_${id}`);
    }
}
console.log(final)