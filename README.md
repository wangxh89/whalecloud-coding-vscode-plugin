## 背景

以ChatGPT为代表的大模型在编程能力方面表现得越来越出色，市面上已经有不少优秀的工具或插件，但几乎都开始收费了，且大部分服务都在国外，效率和稳定性无法保障。浩鲸科技智能编码助手(WhaleCloud CodingPlus)的目标是面向研发人员，提供智能开发的平替服务，同时我们针对公司的一些个性化场景，提供相对应的专属功能。

## 插件介绍

目前插件主要提供了如下功能，使用方法介绍如下：

### 问答
可以直接在插件中与大模型进行讨论，获取相关的信息。  
同时在这个页签的右侧，我们预置了一些常用的、好用的快捷功能，比如：自动写测试用例，只需要在右侧的编辑框中选中一个函数，然后点击这个按钮，即可让给GPT帮我们写出对应的单元测试用例。  
除了单元测试之外，目前还提供如下功能：
- Unicode转码
- 自动添加注释
- 自动重构代码
- 自动解释代码
- 自动翻译英文
- 写正则表达式
- 分析代码问题
- 给出样例代码

### 搜索
在搜索页签，用户可以直接搜索研发云上的各种文档和代码库，比如公司的Java编码规范、数据库规范等等，方便用户查找需要的信息

### 命名
在编码过程中，命名是一个非常高频的工作，无论是变量名、函数名、API接口名等，通过命名服务，可以让GPT帮我们快速生成需要的名称

### 代码辅助
首先在右侧的代码编辑框中选中一段代码，然后在代码辅助中输入代码辅助的目标，比如：增加某功能，用某方式进行重写等，输入确认后，会弹出两个编辑框，对比的方式展示修改，最后弹出提示框，用户可以选择接受这个修改还是拒绝这个修改。

## 安装&配置
1. 直接在插件市场搜索"浩鲸"即可找到本插件，点击安装即可
2. 登录公司云雀研发云，点击右上角的个人信息，在AccessToken管理中，创建一个新的Access Token，并将其保存下来。
3. 在插件的管理页面，选择"Extension Settings"，然后输入上述步骤中保存的token

## 后续计划
1. 近期版本在快速迭代中，修复一些小bug，插件会自动更新
2. 后续考虑引入StarCoder等来支持代码的自动补全（当前推荐大家使用CodeGeeX）

## 支持方式

使用过程中碰到问题，或者有相关建议，欢迎联系我们：
- 王小虎（插件相关）
- 王荣（Prompting）

目前CodingPlus有两个版本，对于IDEA版本的插件，请查看文档: [IDEA安装](https://docs.iwhalecloud.com/doi/cjEoQV/user-manual/idea)，如有问题可以联系艾青。

