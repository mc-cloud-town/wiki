"""
public class Block {
  public static void registerBlocks() {
    // ...

    Logger log = LogManager.getLogger();
    int maxId = 0xFFFF;
    for (int id = 0; id <= maxId; id++) {
      IBlockState state = BLOCK_STATE_IDS.getByValue(id);
      if (state != null) {
        Block block_ = state.getBlock();
        int blockId = Block.REGISTRY.getIDForObject(block_);
        String blockStrId = Block.REGISTRY.getNameForObject(block_).toString();
        log.info(
            String.format(
                "| 0x%04X | %04d | %03d | %39s | %s",
                id,
                id,
                blockId,
                blockStrId,
                state
            ));
      }
    }
  }
}
"""

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass
class BlockState:
    state_id: int
    id: int
    blockID: str
    state: str


file = Path("tmp.txt")
file_content = file.read_text()

blocks = file_content.split("\n")
data: dict[int, BlockState] = {}

for line in blocks:
    try:
        infos = line.split("|")
        i = int(infos[2].strip())
        block = BlockState(
            state_id=i,
            id=int(infos[3].strip()),
            blockID=infos[4].strip(),
            state=infos[5].strip(),
        )
        data[i] = block
    except IndexError:
        pass

result: list[str] = []
result2: list[str] = []
for i in range(0x2000):
    try:
        block = data[i]

        tmp = f"0x{i:04x} | 0b{i:013b} | {block.id:03d} | {block.blockID:39s} | {block.state}"
        result.append(tmp)
        result2.append(tmp)
    except KeyError:
        result.append(f"0x{i:04x} | 0b{i:013b} | --- | {'-' * 39} | ---")
        pass


Path("block_all.txt").write_text("\n".join(result), encoding="utf-8")
Path("block.txt").write_text("\n".join(result2), encoding="utf-8")


json_data = {k: asdict(v) for k, v in data.items()}
print(Path("blocks.json").write_text(json.dumps(json_data, indent=2), encoding="utf-8"))
