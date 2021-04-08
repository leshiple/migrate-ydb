import { Ydb, declareType, TypedData } from 'ydb-sdk';
import Type = Ydb.Type;

interface IMigration {
    fileName: string;
    fileHash: string;
    appliedAt: string;
}

export default class Migration extends TypedData {
    @declareType({ typeId: Type.PrimitiveTypeId.UTF8 })
    public fileName: string;

    @declareType({ typeId: Type.PrimitiveTypeId.UTF8 })
    public fileHash: string;

    @declareType({ typeId: Type.PrimitiveTypeId.UTF8 })
    public appliedAt: string;

    static create(fileName: string, fileHash: string, appliedAt: string): Migration {
      return new this({ fileName, fileHash, appliedAt });
    }

    constructor(data: IMigration) {
      super(data);
      this.fileName = data.fileName;
      this.fileHash = data.fileHash;
      this.appliedAt = data.appliedAt;
    }
}
