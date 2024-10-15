from pydantic import BaseModel


class ErrorBase(BaseModel):
    code: int
    msg: str = ""

    def set_msg(self, msg):
        self.msg = msg
        return self


# 报错
ERROR_INTERNAL = ErrorBase(code=500, msg="内部错误")
# 找不到路径
ERROR_NOT_FOUND = ErrorBase(code=404, msg="api 路径错误")
# 参数错误
ERROR_PARAMETER_ERROR = ErrorBase(code=400, msg="参数错误")
