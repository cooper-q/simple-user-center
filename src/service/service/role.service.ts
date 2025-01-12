import { Injectable, HttpException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Column, Repository } from 'typeorm';
import { Role } from '../../model/entity/role.entity';
import { CreateRoleDto } from '../../model/DTO/role/create_role.dto';
import { UpdateRoleDto } from '../../model/DTO/role/update_role.dto';
import { ApiException } from '../../common/error/exceptions/api.exception';
import { ApiErrorCode } from '../../config/api-error-code.enum';
import { QueryRoleDto } from '../../model/DTO/role/query_role.dto';
import { AddAuthDto } from '../../model/DTO/role/add_auth';
import { Authority } from '../../model/entity/authority.entity';
import { formatDate } from '../../utils/data-time';
import { ApiResource } from '../../model/entity/apiResource.entity';
import { RoleApiResourceEntity } from '../../model/entity/roleApiResource.entity';
import { AddResourceRole } from '../../model/DTO/apiResource/add_resource_role';
import { UserService } from './user.service';
import { RoleQueryPermissionsEntity } from '../../model/entity/role.query.permissions.entity';

@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
        @InjectRepository(Authority) private readonly authorityRepository: Repository<Authority>,
        @InjectRepository(ApiResource) private readonly apiResourceRepository: Repository<ApiResource>,
        @InjectRepository(RoleApiResourceEntity) private readonly roleApiResourceEntityRepository: Repository<RoleApiResourceEntity>,
        @InjectRepository(RoleQueryPermissionsEntity) private readonly roleQueryPermissionsRepository: Repository<RoleQueryPermissionsEntity>,
    ) {
    }

    /*ApiResource, RoleApiResourceEntity
     添加数据
    */
    public async creatRole(role: CreateRoleDto) {
        try {
            const newRole = new Role();
            newRole.name = role.name;
            newRole.desc = role.desc;
            newRole.code = role.code;
            newRole.crateTime = formatDate();
            newRole.updateTime = formatDate();
            return await this.roleRepository.save(newRole);
        } catch (e) {
            throw new ApiException('添加失败', ApiErrorCode.USER_LIST_FILED, 200);
        }
    }

    /**
     * 更新角色
     * @param role
     */
    public async updateRole(role: UpdateRoleDto) {
        try {
            return await this.roleRepository
                .createQueryBuilder('r')
                .update(Role)
                .set({ desc: role.desc, name: role.name, updateTime: formatDate() })
                .where('id = :id', { id: role.id })
                .execute();
        } catch (e) {
            throw new ApiException('更新失败', ApiErrorCode.USER_LIST_FILED, 200);
        }
    }

    /**
     * 删除角色
     * @param id
     */
    public async deleteRole(ids: Array<number | string>) {
        try {
            return await this.roleRepository
                .createQueryBuilder()
                .update(Role)
                .set({ isDelete: 1, deleteTime: formatDate() })
                .whereInIds(ids)
                .execute();
        } catch (e) {
            throw new ApiException('删除失败', ApiErrorCode.USER_LIST_FILED, 200);
        }
    }

    /**
     * 获取角色详情
     * @param query
     */
    public async getRoleInfo(query: string) {
        try {
            return await this.roleRepository
                .createQueryBuilder('r')
                .where('r.id = :id', { id: query })
                .getOne();
        } catch (e) {
            throw new ApiException('查询失败', ApiErrorCode.ROLE_LIST_FAILED, 200);
        }
    }

    /**
     * 校验code的唯一性
     */
    public async checkCode(query: string) {
        try {
            return await this.roleRepository
                .createQueryBuilder('r')
                .where('r.code = :code', { code: query })
                .getOne();
        } catch (e) {
            throw new ApiException('角色已经存在', ApiErrorCode.ROLE_LIST_FAILED, 200);
        }
    }

    /**
     * 校验name的唯一性
     */
    public async checkName(query: string) {
        try {
            return await this.roleRepository
                .createQueryBuilder('r')
                .where('r.name = :name', { name: query })
                .getOne();
        } catch (e) {
            throw new ApiException('角色已经存在', ApiErrorCode.ROLE_LIST_FAILED, 200);
        }
    }

    /**
     * 查看角色列表
     * @param query
     */
    public async getList(query: QueryRoleDto) {
        try {
            const queryConditionList = ['r.isDelete = :isDelete'];
            if (query.name) {
                queryConditionList.push('r.name LIKE :name');
            }
            const queryCondition = queryConditionList.join(' AND ');
            const res = await this.roleRepository
                .createQueryBuilder('r')
                .where(queryCondition, {
                    name: `%${query.name}%`,
                    isDelete: 0,
                })
                .orderBy('r.name', 'ASC')
                .addOrderBy('r.code')
                .skip((query.page - 1) * query.pageSize)
                .take(query.pageSize)
                .getManyAndCount();
            return { data: res[0], count: res[1] };
        } catch (e) {
            throw new ApiException('查询失败', ApiErrorCode.ROLE_LIST_FAILED, 200);
        }
    }

    /**
     * 查询所有角色
     * @param query
     */
    public async getAllList() {
        try {
            const queryConditionList = ['r.isDelete = :isDelete'];
            const queryCondition = queryConditionList.join(' AND ');
            return await this.roleRepository
                .createQueryBuilder('r')
                .where(queryCondition, {
                    isDelete: 0,
                })
                .orderBy('r.name', 'ASC')
                .addOrderBy('r.code')
                .getMany();
        } catch (e) {
            throw new ApiException('查询失败', ApiErrorCode.ROLE_LIST_FAILED, 200);
        }
    }

    /**
     * 给角色授权(菜单级别)
     * @param params
     */
    public async addAuthToRole(params: AddAuthDto) {
        try {
            try {
                const role = await this.roleRepository.findOne(params.roleId, { relations: ['authority'] });
                if (role === undefined) {
                    throw new ApiException('请先添加角色', ApiErrorCode.ORIZATION_CREATED_FILED, 200);
                }
                const authIds = params.authIds ? params.authIds : [];
                await this.roleRepository
                    .createQueryBuilder()
                    .relation(Role, 'authority')
                    .of(params.roleId)
                    .addAndRemove(authIds, role.authority.map(u => u.id));
                return await this.roleRepository.findOne(params.roleId, { relations: ['authority'] });
            } catch (e) {
                throw new ApiException(e.errorMessage || '操作失败', ApiErrorCode.ORIZATION_CREATED_FILED, 200);
            }
        } catch (e) {
            throw new ApiException(e.errorMessage, ApiErrorCode.ROLE_LIST_FAILED, 200);
        }
    }

    /**
     * 接口资源授权
     */
    public async addApiResourceToRole(params: AddResourceRole) {
        try {
            try {
                const role = await this.roleRepository.findOne(params.roleId, { relations: ['authority'] });
                if (role === undefined) {
                    console.log(role);
                    throw new ApiException('请先添加角色', ApiErrorCode.ORIZATION_CREATED_FILED, 200);
                }
                const list: RoleApiResourceEntity[] = params.resourceIds.map((item: number) => {
                    return {
                        roleId: Number(params.roleId),
                        apiResourceId: Number(item),
                    };
                });
                await this.roleApiResourceEntityRepository
                    .createQueryBuilder('r')
                    .delete()
                    .from(RoleApiResourceEntity)
                    .where({ roleId: params.roleId })
                    .execute();
                return this.roleApiResourceEntityRepository
                    .createQueryBuilder('r')
                    .insert()
                    .into(RoleApiResourceEntity)
                    .values(list)
                    .execute();
            } catch (e) {
                console.log(e);
                throw new ApiException(e.errorMessage || '操作失败', ApiErrorCode.ORIZATION_CREATED_FILED, 200);
            }
        } catch (e) {
            throw new ApiException(e.errorMessage, ApiErrorCode.ROLE_LIST_FAILED, 200);
        }
    }

    /**
     * 查询当前角色下的权限(菜单)
     * @param id
     */
    public async getAuthByRole(id: any) {
        try {
            const res = await this.roleRepository
                .createQueryBuilder('r')
                .leftJoinAndSelect('r.authority', 'a')
                .where('r.id = :id', { id })
                .select([
                    'r.name',
                    'r.id',
                    'a',
                ])
                .getManyAndCount();
            return { data: res[0], count: res[1] };
        } catch (e) {
            throw new ApiException('查询失败', ApiErrorCode.ROLE_LIST_FAILED, 200);
        }
    }

    /**
     * 查询当前角色下的权限(菜单)
     * @param id
     */
    public async getApiAuthByRole(id: any) {
        try {
            const res = await this.roleApiResourceEntityRepository
                .createQueryBuilder('r')
                .where('r.roleId = :id', { id })
                .getManyAndCount();
            const list = res[0].map((item) => {
                return item.apiResourceId;
            });
            return list;
        } catch (e) {
            throw new ApiException('查询失败', ApiErrorCode.ROLE_LIST_FAILED, 200);
        }
    }

    /**
     * 查询用户的查询权限
     * @param userID
     */
    public async getQueryPermissionsRole(userID: any) {
        try {
            const sql = `select u.id,u.roleId,rqp.queryCount,rqp.countyCode,rqp.IndustryCode from user as u left JOIN role_query_permissions as rqp on u.roleId=rqp.roleId where u.id=${userID}`;
            const list = await this.roleQueryPermissionsRepository.query(sql);
            return list;
        } catch (e) {
            throw new ApiException('查询失败', ApiErrorCode.ROLE_LIST_FAILED, 200);
        }
    }

    /**
     * 添加角色的查询权限
     * @param roleID json
     */
    public async addQueryPermissionsRole(params: any) {
        try {
            const roleId = params.roleId;
            params = params.json.map(v => {
                v.roleId = roleId;
                return v;
            });
            await this.roleQueryPermissionsRepository
                .createQueryBuilder()
                .insert()
                .into(RoleQueryPermissionsEntity)
                .values(params)
                // .onConflict(`('roleId', 'countyCode', 'IndustryCode', 'queryCount') DO UPDATE SET "roleId" = :roleId,"countyCode" = :countyCode,"IndustryCode" = :IndustryCode,"queryCount" = :queryCount`)
                // .onConflict(`ON CONSTRAINT rciq DO UPDATE SET roleId = 1,countyCode = 1,IndustryCode = 1,queryCount = 1`)
                .printSql()
                .execute();
            return null;
        } catch (e) {
            throw new ApiException('权限添加失败', ApiErrorCode.ADD_QUERY_COUNT_CREATE_FAIL, 200);
        }

    }

    /**
     * 删除查询权限
     * @param roleQueryPermissionIDs
     */
    public async removeQueryPermissionsRole(roleQueryPermissionIDs) {
        try {
            await this.roleQueryPermissionsRepository
                .createQueryBuilder()
                .delete()
                .from(RoleQueryPermissionsEntity)
                .where(`id in (${roleQueryPermissionIDs})`)
                .printSql()
                .execute();
            return null;
        } catch (e) {
            console.log(e);
            throw new ApiException('权限删除失败', ApiErrorCode.REMOVE_QUERY_COUNT_CREATE_FAIL, 200);
        }
    }
}
