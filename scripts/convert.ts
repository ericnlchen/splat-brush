import { execSync } from 'child_process';
import fs from 'fs';

const root_path_of_mvs = 'C:/Users/kauhe/Data2024/visual-computing/MVSGaussian';

const vid_to_splat = async (path: string, id: number) => {
    fs.rmSync('./temp-frames', { recursive: true, force: true });
    fs.mkdirSync('./temp-frames');

    const file_name = path.split("/").at(-1)
    const temp_copy_path = `./temp-frames/${file_name}`;
    fs.copyFileSync(path, temp_copy_path);
    execSync(`ffmpeg -i ${temp_copy_path} -r 4  -color_trc smpte2084 -color_primaries bt2020 -pix_fmt rgb24 ./temp-frames/output_%04d.jpg`);
    fs.rmSync(temp_copy_path);

    const temp_scene_folder = `${root_path_of_mvs}/examples/scene_vid_${id}`;
    fs.rmSync(temp_scene_folder, { recursive: true, force: true });
    fs.mkdirSync(temp_scene_folder);
    fs.mkdirSync(`${temp_scene_folder}/images`);
    const frame_names = fs.readdirSync('./temp-frames/')
    const frame_paths = frame_names.map(n => `./temp-frames/${n}`);
    frame_paths.forEach((p, i) => fs.copyFileSync(p, `${temp_scene_folder}/images/${frame_names[i]}`));
    execSync(`python ${root_path_of_mvs}/lib/colmap/imgs2poses.py -s ${root_path_of_mvs}/examples/scene_vid_${id}`);
    // fs.rmSync('./temp-frames/', { recursive: true, force: true });

    // TRAIN
    // execSync(`python ${root_path_of_mvs}/lib/train.py --eval --iterations 1000 -s ${root_path_of_mvs}/examples/scene_temp`);
    // fs.copyFileSync(`./output/scene_temp/point_cloud/iteration_1000/point_cloud.ply`, `./vid-outputs/${file_name}.ply`);
    // fs.rmSync(`./output`, { recursive: true, force: true });
    // console.log("DONE!")
    return;
}

const video_names = fs.readdirSync('./vid-batch');
const video_paths = video_names.map(p => `./vid-batch/${p}`);

(async () => {
    for(let i = 0; i < video_paths.length; i++){
        try {
            await vid_to_splat(video_paths[i], i);
        } catch(e){

        }
    } 
})();
