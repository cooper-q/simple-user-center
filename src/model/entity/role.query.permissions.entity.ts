import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

// 国家、行业 查询权限关联到角色

@Entity({ name: 'role_query_permissions' })
// @Unique('rciq', ['roleId', 'countyCode', 'IndustryCode', 'queryCount'])
export class RoleQueryPermissionsEntity {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ nullable: false, comment: '角色id' })
    roleId: number;

    @Column({ nullable: true, comment: '国家唯一标识' })
    countyCode: number;

    @Column({ nullable: true, comment: '行业唯一标识' })
    IndustryCode: number;

    @Column({ nullable: true, comment: '可查询条数' })
    queryCount: number;

    @CreateDateColumn({ comment: '创建时间' })
    createdDate: Date;

    @CreateDateColumn({ comment: '更新时间' })
    updateTime: Date;
}
