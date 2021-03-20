import { IsNotEmpty } from 'class-validator';
import { ApiErrorCode } from '../../../config/api-error-code.enum';

export class AddQueryPermissionsRole {
    @IsNotEmpty({ message: '数据格式错误', context: { errorCode: ApiErrorCode.QUERY_COUNT_CREATE_FAIL } })
        // [{countryCode:'',IndustryCode:''}]
    roleId: string;
    json: object[];
}
