---
title: 異步線程獲取概述
description: 本頁將概述 1.12 版本中異步線程獲取區塊的基礎代碼原理
toc: false
---

## 漏洞起因 - 異步線程來源

在 `BlockStainedGlass` 類(染色玻璃) 中的 `onBlockAdded` 和 `breakBlock` (放置或破壞染色玻璃時)，會呼叫 `BlockBeacon.updateColorAsync` 來更新烽火台光柱的顏色。

```java{3,9} [BlockStainedGlass.java] line-numbers
public void onBlockAdded(World worldIn, BlockPos pos, IBlockState state) { // [!code focus]
  if (!worldIn.isRemote) {
    BlockBeacon.updateColorAsync(worldIn, pos); // [!code focus]
  }
} // [!code focus]

public void breakBlock(World worldIn, BlockPos pos, IBlockState state) { // [!code focus]
  if (!worldIn.isRemote) {
    BlockBeacon.updateColorAsync(worldIn, pos); // [!code focus]
  }
} // [!code focus]
```

然而在 `BlockBeacon.updateColorAsync` 中創建了一個 `新的執行緒` 用來判斷，導致 `worldIn.getChunk()` 在非主執行緒讀取 區塊。

```java{2,4,26} [BlockBeacon.java] collapse height=150 line-numbers
public static void updateColorAsync(final World worldIn, final BlockPos glassPos) {
  HttpUtil.DOWNLOADER_EXECUTOR.submit(new Runnable() { // [!code focus]
    public void run() {
      Chunk chunk = worldIn.getChunk(glassPos); // [!code focus]

      for (int i = glassPos.getY() - 1; i >= 0; --i) {
        final BlockPos blockpos = new BlockPos(glassPos.getX(), i, glassPos.getZ());

        if (!chunk.canSeeSky(blockpos)) break;

        IBlockState iblockstate = worldIn.getBlockState(blockpos);
        if (iblockstate.getBlock() == Blocks.BEACON) {
          ((WorldServer)worldIn).addScheduledTask(new Runnable() {
            public void run() {
              TileEntity tileentity = worldIn.getTileEntity(blockpos);

              if (tileentity instanceof TileEntityBeacon) {
                ((TileEntityBeacon)tileentity).updateBeacon();
                worldIn.addBlockEvent(blockpos, Blocks.BEACON, 1, 0);
              }
            }
          });
        }
      }
    }
  }); // [!code focus]
}
```

在正常情況下，`getChunk` 會嘗試 `loadChunk` 並獲取到對應的區塊，但在特殊情況下 `loadChunk` 會返回 `null` 從而觸發地形生成(生成基本地形，並裝飾)。

```java {2,6,10,14,26} [World.java] collapse height=150 line-numbers
public Chunk getChunk(BlockPos pos) {
  return this.getChunk(pos.getX() >> 4, pos.getZ() >> 4); // [!code focus] 會呼叫到下面的那個函數
}

public Chunk getChunk(int chunkX, int chunkZ) { // [!code focus] <- 呼叫這個
  return this.chunkProvider.provideChunk(chunkX, chunkZ); // [!code focus]
}

public Chunk provideChunk(int x, int z) { // [!code focus]
  Chunk chunk = this.loadChunk(x, z); // [!code focus]
  if (chunk == null) { // [!code focus]
    long i = ChunkPos.asLong(x, z);
    try {
      chunk = this.chunkGenerator.generateChunk(x, z); // [!code focus]
    } catch (Throwable throwable) {
      CrashReport crashreport = CrashReport.makeCrashReport(throwable, "Exception generating new chunk");
      CrashReportCategory crashreportcategory = crashreport.makeCategory("Chunk to be generated");
      crashreportcategory.addCrashSection("Location", String.format("%d,%d", x, z));
      crashreportcategory.addCrashSection("Position hash", Long.valueOf(i));
      crashreportcategory.addCrashSection("Generator", this.chunkGenerator);
      throw new ReportedException(crashreport);
    }

    this.loadedChunks.put(i, chunk);
    chunk.onLoad();
    chunk.populate(this, this.chunkGenerator); // [!code focus]
  } // [!code focus]

  return chunk;
} // [!code focus]
```

其中我們需要的是裝飾處理 (`chunk.populate(this, this.chunkGenerator)`)，在呼叫 `chunk.populate` 後會嘗試呼叫 `generator.populate`，在這裡會生成各式結構，同時也會生成水和岩漿等等。

```java {8,12,16,22,27,34} [Chunk.java] collapse height=150 line-numbers
public void populate(IChunkProvider chunkProvider, IChunkGenerator chunkGenrator) { // [!code focus]
  Chunk chunk = chunkProvider.getLoadedChunk(this.x, this.z - 1);
  Chunk chunk1 = chunkProvider.getLoadedChunk(this.x + 1, this.z);
  Chunk chunk2 = chunkProvider.getLoadedChunk(this.x, this.z + 1);
  Chunk chunk3 = chunkProvider.getLoadedChunk(this.x - 1, this.z);

  if (chunk1 != null && chunk2 != null && chunkProvider.getLoadedChunk(this.x + 1, this.z + 1) != null) {
    this.populate(chunkGenrator); // [!code focus] 會呼叫到下面的那個函數 [裝飾自己]
  }

  if (chunk3 != null && chunk2 != null && chunkProvider.getLoadedChunk(this.x - 1, this.z + 1) != null) {
    chunk3.populate(chunkGenrator); // [!code focus] 會呼叫到下面的那個函數 [裝飾旁邊]
  }

  if (chunk != null && chunk1 != null && chunkProvider.getLoadedChunk(this.x + 1, this.z - 1) != null) {
    chunk.populate(chunkGenrator); // [!code focus] 會呼叫到下面的那個函數 [裝飾旁邊]
  }

  if (chunk != null && chunk3 != null) {
    Chunk chunk4 = chunkProvider.getLoadedChunk(this.x - 1, this.z - 1);
    if (chunk4 != null) {
      chunk4.populate(chunkGenrator); // [!code focus] 會呼叫到下面的那個函數 [裝飾旁邊]
    }
  }
} // [!code focus]

protected void populate(IChunkGenerator generator) { // [!code focus] <- 呼叫這個
  if (this.isTerrainPopulated()) {
    if (generator.generateStructures(this, this.x, this.z)) {
      this.markDirty();
    }
  } else {
    this.checkLight();
    generator.populate(this.x, this.z); // [!code focus]
    this.markDirty();
  }
} // [!code focus]
```

> 在不同的緯度會有對應的不同處理辦法，下面的代碼是 `ChunkGeneratorOverworld` 裡的函數實現 (主世界)

```java{27,36} [ChunkGeneratorOverworld.java] collapse height=150 line-numbers
public void populate(int x, int z) { // [!code focus]
  BlockFalling.fallInstantly = true;
  int i = x * 16;
  int j = z * 16;
  BlockPos blockpos = new BlockPos(i, 0, j);
  Biome biome = this.world.getBiome(blockpos.add(16, 0, 16));
  this.rand.setSeed(this.world.getSeed());
  long k = this.rand.nextLong() / 2L * 2L + 1L;
  long l = this.rand.nextLong() / 2L * 2L + 1L;
  this.rand.setSeed((long) x * k + (long) z * l ^ this.world.getSeed());
  boolean flag = false;
  ChunkPos chunkpos = new ChunkPos(x, z);

  if (this.mapFeaturesEnabled) {
    if (this.settings.useMineShafts) {
      this.mineshaftGenerator.generateStructure(this.world, this.rand, chunkpos);
    }

    // ... 其他結構生成
  }

  if (biome != Biomes.DESERT && biome != Biomes.DESERT_HILLS && this.settings.useWaterLakes && !flag
      && this.rand.nextInt(this.settings.waterLakeChance) == 0) {
    int i1 = this.rand.nextInt(16) + 8;
    int j1 = this.rand.nextInt(256);
    int k1 = this.rand.nextInt(16) + 8;
    (new WorldGenLakes(Blocks.WATER)).generate(this.world, this.rand, blockpos.add(i1, j1, k1)); // [!code focus] 生成水
  }

  if (!flag && this.rand.nextInt(this.settings.lavaLakeChance / 10) == 0 && this.settings.useLavaLakes) {
    int i2 = this.rand.nextInt(16) + 8;
    int l2 = this.rand.nextInt(this.rand.nextInt(248) + 8);
    int k3 = this.rand.nextInt(16) + 8;

    if (l2 < this.world.getSeaLevel() || this.rand.nextInt(this.settings.lavaLakeChance / 8) == 0) {
      (new WorldGenLakes(Blocks.LAVA)).generate(this.world, this.rand, blockpos.add(i2, l2, k3)); // [!code focus] 生成岩漿
    }
  }

  if (this.settings.useDungeons) {
    for (int j2 = 0; j2 < this.settings.dungeonChance; ++j2) {
      int i3 = this.rand.nextInt(16) + 8;
      int l3 = this.rand.nextInt(256);
      int l1 = this.rand.nextInt(16) + 8;
      (new WorldGenDungeons()).generate(this.world, this.rand, blockpos.add(i3, l3, l1));
    }
  }

  biome.decorate(this.world, this.rand, new BlockPos(i, 0, j));
  WorldEntitySpawner.performWorldGenSpawning(this.world, biome, i + 8, j + 8, 16, 16, this.rand);
  blockpos = blockpos.add(8, 0, 8);
  for (int k2 = 0; k2 < 16; ++k2) {
    for (int j3 = 0; j3 < 16; ++j3) {
      BlockPos blockpos1 = this.world.getPrecipitationHeight(blockpos.add(k2, 0, j3));
      BlockPos blockpos2 = blockpos1.down();

      if (this.world.canBlockFreezeWater(blockpos2)) {
        this.world.setBlockState(blockpos2, Blocks.ICE.getDefaultState(), 2);
      }

      if (this.world.canSnowAt(blockpos1, true)) {
        this.world.setBlockState(blockpos1, Blocks.SNOW_LAYER.getDefaultState(), 2);
      }
    }
  }

  BlockFalling.fallInstantly = false;
} // [!code focus]
```

在世界裝飾時的方塊變更和玩家或活塞變更方塊並無本質上的區別，因此若在這個新執行緒中執行放置方塊等操作，就會導致異步的方塊更新，也就是說若我們使用偵測器檢測到此異步的方塊更新，就會生成異步偵測器 (如何獲取將在下篇文章說明 \[如果沒看到就是還在寫不然就是鴿了])。

## 簡單描述

在 Minecraft `1.12` 中，染色玻璃在放置或破壞時，會透過 `BlockBeacon.updateColorAsync` 在 `非主執行緒` 更新烽火台的顏色。

這個異步更新會呼叫 `world.getChunk()` 取得區塊，如果該區塊尚未生成，會觸發 區塊生成與裝飾（例如生成水、岩漿、地牢等結構）。

由於這些操作不是在主執行緒執行，會造成 `異步方塊更新`，也就是方塊狀態在非同步環境下改變，可能被偵測到並生成 `異步偵測器`。

換句話說，放置或破壞染色玻璃，可能間接觸發世界生成與裝飾的非同步操作，這是異步線程獲取的核心問題。

::mermaid
```text
flowchart TD
  subgraph Main [主執行緒]
    A[當 放置或破壞染色玻璃] --> B[呼叫 BlockBeacon.updateColorAsync]
    B --> C[建立非主執行緒]
  end

  subgraph Async [異步執行緒]
    D["取得區塊 world.getChunk()"] --> E{區塊已生成?}

    E -- 是 --> F[執行烽火台邏輯]
    E -- 否 --> G["生成區塊 chunkGenerator.generateChunk()"]

    G --> H["區塊裝飾 chunk.populate()"]
    H --> I[生成水/岩漿等裝飾方塊]
  end

  subgraph Note1["若使用偵測器偵測方出的水就會產生異步偵測器，若連接的很多，服務器就無法再短時間處理完(因為生成區塊時會短暫開啟 ITT 偵測器會以指數級更新)，線程步會很快退出"]
    direction TB
  end

  Note1 --- I

  C --> D
  I --> F
  F --> L[關閉線程]
```
::

::alert{type="note" icon="lucide:pencil"}
若還不知道 `ITT` 是啥，罰你回去複習 [這篇文章](/thread-store/rule/scheduledupdatesareimmediate)。
::

::div{class="bg-white px-2 mt-4"}
  ::mermaid
  ```text
  gantt
    title Minecraft 執行續
    dateFormat X
    axisFormat %s

    section 主線程
    正常處理各式遊戲狀態       : 0, 8
    section 二號線程
    正常檢索                   : 1, 3
    section 三號線程...
    使用長偵測器造成巨量更新時 : 1, 8
  ```
  ::
::
