---
title: 調色板
---

## 調色板 (palette)

| 方塊狀態數 | bits | 調色板類型                                | 備註                                                                                              |
| ---------- | ---- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1~16       | 4    | **線性調色板 (BlockStatePaletteLinear)**  | `bits <= 4` 強制固定 4 bits，不會用 1,2,3 bits                                                    |
| 17~32      | 5    | **哈希調色板 (BlockStatePaletteHashMap)** | 使用 HashMap，查找成本略高於線性，但支援動態擴充。狀態數落在此區間時分配 5 bits。                 |
| 33~64      | 6    | **哈希調色板 (BlockStatePaletteHashMap)** | 同上，當狀態數超過 32 會自動升級至 6 bits                                                         |
| 65~128     | 7    | **哈希調色板 (BlockStatePaletteHashMap)** | 同上，當狀態數超過 64 會自動升級至 7 bits                                                         |
| 129~256    | 8    | **哈希調色板 (BlockStatePaletteHashMap)** | HashMap 的上限，最多支援 256 種狀態，對應 8 bits 編碼                                             |
| >= 257     | 9+   | **註冊表調色板 (REGISTRY_BASED_PALETTE)** | 直接用全域 `Block.BLOCK_STATE_IDS`，bits 會依實際註冊數量計算 (預設 HashTableSize 為 512 ($2^9$)) |

```java{1,3,10-18,26} [BlockStateContainer.java] collapse height=150 line-numbers
public class BlockStateContainer implements IBlockStatePaletteResizer { // [!code focus]
  public BlockStateContainer() {
    this.setBits(4); // [!code focus]
  }

  private void setBits(int bitsIn) {
    if (bitsIn != this.bits) {
      this.bits = bitsIn;

      if (this.bits <= 4) { // [!code focus]
        this.bits = 4; // [!code focus]
        this.palette = new BlockStatePaletteLinear(this.bits, this); // [!code focus]
      } else if (this.bits <= 8) { // [!code focus]
        this.palette = new BlockStatePaletteHashMap(this.bits, this); // [!code focus]
      } else { // [!code focus]
        this.palette = REGISTRY_BASED_PALETTE; // [!code focus]
        this.bits = MathHelper.log2DeBruijn(Block.BLOCK_STATE_IDS.size()); // [!code focus]
      } // [!code focus]

      this.palette.idFor(AIR_BLOCK_STATE);
      this.storage = new BitArray(this.bits, 4096);
    }
  }

  // ...
} // [!code focus]
```

### 線性調色板 (BlockStatePaletteLinear)

```java{1,8,14} [BlockStatePaletteLinear.java] collapse height=150 line-numbers
public class BlockStatePaletteLinear implements IBlockStatePalette { // [!code focus]
  private final IBlockState[] states;
  private final IBlockStatePaletteResizer resizeHandler;
  private final int bits;
  private int arraySize;

  public BlockStatePaletteLinear(int bitsIn, IBlockStatePaletteResizer resizeHandlerIn) {
    this.states = new IBlockState[1 << bitsIn]; // [!code focus] bitsIn 傳入的是 4，即 16 個狀態
    this.bits = bitsIn;
    this.resizeHandler = resizeHandlerIn;
  }

  // ...
} // [!code focus]
```

### 哈希調色板 (BlockStatePaletteHashMap)

```java{1,9,11} [BlockStatePaletteHashMap.java] collapse height=150 line-numbers
public class BlockStatePaletteHashMap implements IBlockStatePalette { // [!code focus]
  private final IntIdentityHashBiMap<IBlockState> statePaletteMap;
  private final IBlockStatePaletteResizer paletteResizer;
  private final int bits;

  public BlockStatePaletteHashMap(int bitsIn, IBlockStatePaletteResizer paletteResizerIn) {
    this.bits = bitsIn;
    this.paletteResizer = paletteResizerIn;
    this.statePaletteMap = new IntIdentityHashBiMap<IBlockState>(1 << bitsIn); // [!code focus] bitsIn 傳入的是 5~8，即 17~256 個狀態
  }
} // [!code focus]
```

### 註冊表調色板 (REGISTRY_BASED_PALETTE)

::code-group

```java{1,2,5} [Block.java] collapse height=150 line-numbers
public class Block implements IBlock { // [!code focus]
  public static final ObjectIntIdentityMap<IBlockState> BLOCK_STATE_IDS = new ObjectIntIdentityMap<IBlockState>(); // [!code focus]

  // ...
} // [!code focus]
```

```java{1,6,10,11,15} [ObjectIntIdentityMap.java] collapse height=150 line-numbers
public class ObjectIntIdentityMap<T> implements IObjectIntIterable<T> { // [!code focus]
  private final IdentityHashMap<T, Integer> identityMap;
  private final List<T> objectList;

  public ObjectIntIdentityMap() {
    this(512); // [!code focus] 預設大小為 512，但會自動調整
  }

  public ObjectIntIdentityMap(int expectedSize) {
    this.objectList = Lists.<T>newArrayListWithExpectedSize(expectedSize); // [!code focus] 預設大小為 512，但會自動調整
    this.identityMap = new IdentityHashMap<T, Integer>(expectedSize); // [!code focus] 預設大小為 512，但會自動調整
  }

  // ...
} // [!code focus]
```

::
