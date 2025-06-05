import * as fs from 'fs';
import * as path from 'path';
import { parseFile } from 'music-metadata';
import { File, Picture, Tag, ByteVector } from 'node-taglib-sharp';

async function testMetadata() {
  try {
    // 使用绝对路径
    const musicDir = path.resolve(process.cwd(), 'localmusic');
    console.log('Music directory path:', musicDir);

    if (!fs.existsSync(musicDir)) {
      console.error(`Music directory does not exist: ${musicDir}`);
      return;
    }

    const files = fs.readdirSync(musicDir);
    console.log('\nFound files:', files);

    for (const file of files) {
      const filePath = path.join(musicDir, file);
      console.log(`\n========== Testing file: ${file} ==========`);

      // 1. 测试 node-taglib-sharp
      console.log('\n1. Testing node-taglib-sharp:');
      try {
        const tagFile = File.createFromPath(filePath);
        const tag = tagFile.tag;
        const properties = tagFile.properties;

        console.log('Basic metadata:', {
          title: tag.title,
          performers: tag.performers,
          album: tag.album
        });

        console.log('Pictures:', {
          hasPictures: tag.pictures && tag.pictures.length > 0,
          picturesCount: tag.pictures ? tag.pictures.length : 0
        });

        if (tag.pictures && tag.pictures.length > 0) {
          const picture = tag.pictures[0];
          console.log('First picture:', {
            mimeType: picture.mimeType,
            dataLength: picture.data ? picture.data.length : 0
          });

          // 尝试保存图片到文件
          const pictureData = picture.data.toByteArray();
          const testImagePath = path.join(process.cwd(), `test-cover-taglib-${path.parse(file).name}.jpg`);
          fs.writeFileSync(testImagePath, Buffer.from(pictureData));
          console.log('Saved test image to:', testImagePath);
        }

        tagFile.dispose();
      } catch (error) {
        console.error('Error in node-taglib-sharp:', error);
      }

      // 2. 测试 music-metadata
      console.log('\n2. Testing music-metadata:');
      try {
        const metadata = await parseFile(filePath);
        const { common, format } = metadata;

        console.log('Basic metadata:', {
          title: common.title,
          artist: common.artist,
          album: common.album
        });

        console.log('Pictures:', {
          hasPictures: common.picture && common.picture.length > 0,
          picturesCount: common.picture ? common.picture.length : 0
        });

        if (common.picture && common.picture.length > 0) {
          const picture = common.picture[0];
          console.log('First picture:', {
            format: picture.format,
            dataLength: picture.data.length
          });

          // 尝试保存图片到文件
          const testImagePath = path.join(process.cwd(), `test-cover-musicmetadata-${path.parse(file).name}.jpg`);
          fs.writeFileSync(testImagePath, picture.data);
          console.log('Saved test image to:', testImagePath);
        }
      } catch (error) {
        console.error('Error in music-metadata:', error);
      }
    }
  } catch (error) {
    console.error('General error:', error);
  }
}

// 运行测试
testMetadata().then(() => {
  console.log('\nTest completed');
}).catch(error => {
  console.error('Test failed:', error);
}); 