import * as fs from 'fs';
import * as path from 'path';
import { FastifyInstance } from 'fastify';
import { parseFile } from 'music-metadata';
import { File, Picture, Tag, ByteVector } from 'node-taglib-sharp';

export const initLocalMusicAPI = async (fastify: FastifyInstance) => {
  // 获取所有本地音乐列表
  fastify.get('/api/localmusic', async (_, reply) => {
    try {
      // 使用绝对路径
      const musicDir = path.resolve(process.cwd(), 'localmusic');
      console.log('Music directory path:', musicDir);
      
      if (!fs.existsSync(musicDir)) {
        console.error(`Music directory does not exist: ${musicDir}`);
        reply.status(500).send({ error: 'Music directory not found' });
        return;
      }

      const files = fs.readdirSync(musicDir);
      console.log('Found files:', files);
      
      const musicFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.flac', '.wav', '.m4a'].includes(ext);
      });
      console.log('Filtered music files:', musicFiles);

      const songs = await Promise.all(musicFiles.map(async (file, index) => {
        const filePath = path.join(musicDir, file);
        console.log(`\n========== Processing file: ${filePath} ==========`);
        
        try {
          const stats = fs.statSync(filePath);
          
          // 使用 node-taglib-sharp 读取元数据
          console.log('Reading file with node-taglib-sharp...');
          const tagFile = File.createFromPath(filePath);
          const tag = tagFile.tag;
          const properties = tagFile.properties;
          
          // 读取音乐文件元数据（使用 music-metadata 作为备用）
          console.log('Reading metadata with music-metadata...');
          const metadata = await parseFile(filePath, {
            duration: true,
            skipCovers: false,
            skipPostHeaders: false
          });
          
          const { common, format } = metadata;

          // 判断音质等级
          let quality: string;
          const sampleRate = properties.audioSampleRate || format.sampleRate || 0;
          const bitsPerSample = properties.bitsPerSample || format.bitsPerSample || 0;
          
          if (sampleRate >= 96000 || bitsPerSample > 16) {
            quality = "Hi-Res";
          } else if (sampleRate >= 44100) {
            quality = "HQ";
          } else {
            quality = "SQ";
          }

          // 处理封面（优先使用 taglib）
          let cover = "/images/song.jpg?assest";
          try {
            if (tag.pictures && tag.pictures.length > 0) {
              const picture = tag.pictures[0];
              const pictureData = picture.data.toByteArray();
              const base64Data = Buffer.from(pictureData).toString('base64');
              cover = `data:${picture.mimeType || 'image/jpeg'};base64,${base64Data}`;
              console.log('Successfully processed cover with taglib');
            } else if (common.picture && common.picture.length > 0) {
              const picture = common.picture[0];
              const base64Data = picture.data.toString('base64');
              cover = `data:${picture.format};base64,${base64Data}`;
              console.log('Successfully processed cover with music-metadata');
            }
          } catch (error: any) {
            console.error('Error processing cover:', error);
            // 如果处理封面时出错，使用默认封面
            cover = "/images/song.jpg?assest";
          }

          // 处理艺术家信息（优先使用 taglib）
          let artists = "未知歌手";
          const taglibArtist = tag.performers && tag.performers.length > 0 ? tag.performers[0] : null;
          if (taglibArtist) {
            artists = taglibArtist;
          } else if (common.artists && common.artists.length > 0) {
            artists = common.artists[0];
          } else if (common.artist) {
            artists = common.artist;
          }
          
          const songInfo = {
            id: index + 1,
            name: tag.title || common.title || path.parse(file).name,
            artists,
            album: tag.album || common.album || "本地音乐",
            alia: common.comment?.[0] || "",
            cover,
            duration: Math.floor((format.duration || 0) * 1000),
            size: Number((stats.size / (1024 * 1024)).toFixed(2)),
            path: `/localmusic/${file}`,
            quality,
            type: "song",
            br: format.bitrate ? Math.floor(format.bitrate / 1000) : 0,
            sampleRate,
            bitsPerSample,
            codec: format.codec || properties.codecs?.[0] || "未知"
          };
          
          // 释放资源
          tagFile.dispose();
          
          return songInfo;
        } catch (error: any) {
          console.error(`Error processing file ${file}:`, error);
          return null;
        }
      }));

      // 过滤掉处理失败的文件
      const validSongs = songs.filter(song => song !== null);
      console.log(`Successfully processed ${validSongs.length} out of ${musicFiles.length} files`);
      
      reply.send(validSongs);
    } catch (error: any) {
      console.error('Error scanning local music:', error);
      reply.status(500).send({ error: 'Failed to scan local music', details: error.message });
    }
  });

  // 获取单个音乐文件的元数据
  fastify.get('/api/localmusic/:filename', async (request, reply) => {
    try {
      const { filename } = request.params as { filename: string };
      const musicDir = path.resolve(process.cwd(), 'localmusic');
      const filePath = path.join(musicDir, filename);
      console.log(`Attempting to read file: ${filePath}`);

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        reply.status(404).send({ error: 'File not found' });
        return;
      }

      // 使用 node-taglib-sharp 读取元数据
      const tagFile = File.createFromPath(filePath);
      const tag = tagFile.tag;

      // 处理封面
      let cover = "/images/song.jpg?assest";
      try {
        if (tag.pictures && tag.pictures.length > 0) {
          const picture = tag.pictures[0];
          const pictureData = picture.data.toByteArray();
          const base64Data = Buffer.from(pictureData).toString('base64');
          cover = `data:${picture.mimeType || 'image/jpeg'};base64,${base64Data}`;
        }
      } catch (error: any) {
        console.error('Error processing cover:', error);
      }

      // 释放资源
      tagFile.dispose();

      reply.send({ cover });
    } catch (error: any) {
      console.error('Error reading file metadata:', error);
      reply.status(500).send({ error: 'Failed to read file metadata' });
    }
  });
}; 