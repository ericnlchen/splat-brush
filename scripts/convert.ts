import { execSync } from 'child_process';
import fs from 'fs';

const root_path_of_mvs = 'C:/Users/kauhe/Data2024/visual-computing/MVSGaussian';

const vid_to_splat = async (path: string, id: string) => {
    if(fs.existsSync(`${root_path_of_mvs}/examples/scene_vid_${id}`)){
        return;
    }

    fs.rmSync('./temp-frames', { recursive: true, force: true });
    fs.mkdirSync('./temp-frames');

    const file_name = path.split("/").at(-1)
    const temp_copy_path = `./temp-frames/${file_name}`;
    fs.copyFileSync(path, temp_copy_path);
    execSync(
        `ffmpeg -i ${temp_copy_path} -r 2 -color_trc smpte2084 -color_primaries bt2020 -pix_fmt rgb24 ./temp-frames/output_%04d.jpg`, 
        { stdio: 'ignore' }
    );
    fs.rmSync(temp_copy_path);
    console.log(`CONVERTED VIDEO INTO JPG FRAMES`);

    const mvsgs_scene_folder = `${root_path_of_mvs}/examples/scene_vid_${id}`;
    fs.rmSync(mvsgs_scene_folder, { recursive: true, force: true });
    fs.mkdirSync(mvsgs_scene_folder);
    fs.mkdirSync(`${mvsgs_scene_folder}/images`);
    const frame_names = fs.readdirSync('./temp-frames/')
    const frame_paths = frame_names.map(n => `./temp-frames/${n}`);
    const frame_names_filtered: string[] = [];
    const frame_paths_filtered: string[] = [];
    for(let i = 0; i < frame_names.length; i++){
        try {
            execSync(`python ./extract-ring.py ${frame_paths[i]}`);
            frame_names_filtered.push(frame_names[i]);
            frame_paths_filtered.push(frame_paths[i]);
        } catch(error) {
            console.log("SEGMENTATION FAILED")
        }
    }
    for(let i = 0; i < frame_names_filtered.length; i++){
        const name = frame_names_filtered[i];
        const path = frame_paths_filtered[i];
        fs.copyFileSync(path, `${mvsgs_scene_folder}/images/${name}`);
    }
    console.log("COPIED FILES TO MVSGS FOLDER");

    try {
        execSync(`python ${root_path_of_mvs}/lib/colmap/imgs2poses.py -s ${root_path_of_mvs}/examples/scene_vid_${id}`);
    } catch(error) {
        console.log(`ERROR: PROCESSING scene_vid_${id} FAILED`);
    }
    fs.rmSync('./temp-frames/', { recursive: true, force: true });
    console.log("RAN COLMAP SUCCESSFULLY");

    frame_names_filtered.forEach((name, i) => {
        const img_path = `${mvsgs_scene_folder}/images/${name}`;
        try {
            execSync(`python ./extract-ring.py ${img_path}`);
        } catch(err){
            console.log(`SEGMENTATION FAILED AGAIN`);
        }
    });
    frame_names_filtered.forEach((name, i) => {
        const img_path = `${mvsgs_scene_folder}/images/${name}`;
        fs.rmSync(img_path);
        fs.renameSync(`${img_path}.temp.png`, img_path);
    });
    console.log("SEGMENTED COLMAP-PROCESSED IMAGES")

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
        const id = video_paths[i].split('/').at(-1)!.split('.')[0];
        try {
            await vid_to_splat(video_paths[i], id);
        } catch(e){

        }
    } 
})();
