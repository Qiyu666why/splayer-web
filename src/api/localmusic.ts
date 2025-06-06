import axios from "axios";
import type { SongType } from "@/types/main";
 
// 获取本地音乐列表
export const getLocalMusicList = async (): Promise<SongType[]> => {
  const response = await axios.get("/api/localmusic");
  return response.data;
}; 