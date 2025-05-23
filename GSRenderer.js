import parse_ply_comp_wgsl from './shaders/parse_ply_comp.js';
import rank_comp_wgsl from './shaders/rank_comp.js';
import splat_wgsl from './shaders/splat.js';
import parse_ply_comp_4dgs_wgsl from './shaders/parse_ply_comp_4dgs.js';
import rank_comp_4dgs_wgsl from './shaders/rank_comp_4dgs.js';
import splat_4dgs_wgsl from './shaders/splat_4dgs.js';
import splat_debug_wgsl from './shaders/splat_debug.js';
import splat_debug_4dgs_wgsl from './shaders/splat_debug_4dgs.js';
import { GlobalVar } from "./Global.js";

class GSRenderer {
    constructor(device_) {
        this.device = device_;

        this.set1 = {
            'pos': null,
            'cov3d': null,
            'color': null,
            'sh': null,
        };
        this.set2 = {
            'key': null,
            'index': null,
        };
        this.set3 = {
            'visibleNum': null
        };
        this.set_other = {
            'indirect': null,
            'debug': null,
            'staging': null,
        };

        this.bindGroup = {
            'MODE_3DGS': {
                'set1': null,
                'set2': null,
                'set3': null,
            },
            'MODE_SpaceTime_LITE': {
                'set1': null,
                'set2': null,
                'set3': null,
            }
        }
        this.bindGroupLayout = {
            'MODE_3DGS': {
                'set1': null,
                'set2': null,
                'set3': null,
            },
            'MODE_SpaceTime_LITE': {
                'set1': null,
                'set2': null,
                'set3': null,
            }
        }
        this.bindGroup_read = {
            'MODE_3DGS': {
                'set2': null,
                'set3': null,
            },
            'MODE_SpaceTime_LITE': {
                'set2': null,
                'set3': null,
            }
        }
        this.bindGroupLayout_read = {
            'MODE_3DGS': {
                'set2': null,
                'set3': null,
            },
            'MODE_SpaceTime_LITE': {
                'set2': null,
                'set3': null,
            }
        }
        this.bindGroup_debug = {
            'MODE_3DGS': {
                'set3': null,
            },
            'MODE_SpaceTime_LITE': {
                'set3': null,
            }
        }
        this.bindGroupLayout_debug = {
            'MODE_3DGS': {
                'set3': null,
            },
            'MODE_SpaceTime_LITE': {
                'set3': null,
            }
        }

        this.presentationFormat = null;
        this.pipeline = {
            'MODE_3DGS': {
                'parsePly': null,
                'rank': null,
                'splat': null,
                'debug': null,
            },
            'MODE_SpaceTime_LITE': {
                'parsePly': null,
                'rank': null,
                'splat': null,
                'debug': null,
            },
        };
        this.pipelineLayout = {
            'MODE_3DGS': {
                'parsePly': null,
                'rank': null,
                'splat': null,
                'debug': null,
            },
            'MODE_SpaceTime_LITE': {
                'parsePly': null,
                'rank': null,
                'splat': null,
                'debug': null,
            },
        };

        this.preAllocate();
    }

    preAllocate() {
        const DEBUG_FLAG = GlobalVar ? GPUBufferUsage.COPY_SRC : 0;
        const maxCount = GlobalVar.MAX_SPLAT_COUNT;
        {
            this.set1.pos = this.device.createBuffer(
                { size: maxCount * 3 * 4, usage: GPUBufferUsage.STORAGE | DEBUG_FLAG, label: "pos" }
            );
            this.set1.cov3d = this.device.createBuffer(
                { size: maxCount * 6 * 4, usage: GPUBufferUsage.STORAGE | DEBUG_FLAG, label: "cov3d" }
            );
            this.set1.color = this.device.createBuffer(
                { size: maxCount * 4 * 4, usage: GPUBufferUsage.STORAGE | DEBUG_FLAG, label: "color" }
            );
            this.set1.sh = this.device.createBuffer(
                { size: maxCount * 48 * 2, usage: GPUBufferUsage.STORAGE | DEBUG_FLAG, label: "sh" }
            );
        }
        {
            this.set2.key = this.device.createBuffer(
                { size: maxCount * 1 * 4, usage: GPUBufferUsage.STORAGE | DEBUG_FLAG, label: "key" }
            );
            this.set2.index = this.device.createBuffer(
                { size: maxCount * 1 * 4, usage: GPUBufferUsage.STORAGE | DEBUG_FLAG, label: "index" }
            );
        }
        {
            this.set3.visibleNum = this.device.createBuffer(
                { size: 1 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, label: "visibleNum" }
            );
        }
        {
            this.set_other.indirect = this.device.createBuffer(
                { size: 5 * 4, usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST | DEBUG_FLAG, label: "indirect", mappedAtCreation: true, }
            );
            new Uint32Array(this.set_other.indirect.getMappedRange()).set(new Uint32Array([6, 0, 0, 0, 0]));
            this.set_other.indirect.unmap();

            this.set_other.staging = this.device.createBuffer(
                { size: 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST, label: "staging" }
            );

            if (GlobalVar.DEBUG) {
                this.set_other.debug = this.device.createBuffer(
                    { size: 256 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | DEBUG_FLAG, label: `debug` }
                );
            }
        }
    }

    createBindGroup() {
        /**
         * MODE_3DGS
         */
        this.bindGroupLayout.MODE_3DGS.set1 = this.device.createBindGroupLayout({
            entries: [
                {   // set1.pos
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
                {   // set1.cov3d
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
                {   // set1.color
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
                {   // set1.sh
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
            ],
        });
        this.bindGroup.MODE_3DGS.set1 = this.device.createBindGroup({
            label: `MODE_3DGS.set1`,
            layout: this.bindGroupLayout.MODE_3DGS.set1,
            entries: [
                {   // set1.pos
                    binding: 0,
                    resource: {
                        buffer: this.set1.pos,
                    },
                },
                {   // set1.cov3d
                    binding: 1,
                    resource: {
                        buffer: this.set1.cov3d,
                    },
                },
                {   // set1.color
                    binding: 2,
                    resource: {
                        buffer: this.set1.color,
                    },
                },
                {   // set1.sh
                    binding: 3,
                    resource: {
                        buffer: this.set1.sh,
                    },
                },
            ],
        });

        this.bindGroupLayout.MODE_3DGS.set2 = this.device.createBindGroupLayout({
            entries: [
                {   // set2.key
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
                {   // set2.index
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
            ],
        });
        this.bindGroup.MODE_3DGS.set2 = this.device.createBindGroup({
            label: `MODE_3DGS.set2`,
            layout: this.bindGroupLayout.MODE_3DGS.set2,
            entries: [
                {   // set2.key
                    binding: 0,
                    resource: {
                        buffer: this.set2.key,
                    },
                },
                {   // set2.index
                    binding: 1,
                    resource: {
                        buffer: this.set2.index,
                    },
                },
            ],
        });

        this.bindGroupLayout.MODE_3DGS.set3 = this.device.createBindGroupLayout({
            entries: [
                {   // set3.indirect
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
            ],
        });
        this.bindGroup.MODE_3DGS.set3 = this.device.createBindGroup({
            label: `MODE_3DGS.set3`,
            layout: this.bindGroupLayout.MODE_3DGS.set3,
            entries: [
                {   // set3.indirect
                    binding: 0,
                    resource: {
                        buffer: this.set3.visibleNum,
                    },
                },
            ],
        });

        if (GlobalVar.DEBUG) {
            this.bindGroupLayout_debug.MODE_3DGS.set3 = this.device.createBindGroupLayout({
                entries: [
                    {   // set other debug
                        binding: 0,
                        visibility: GPUShaderStage.COMPUTE,
                        buffer: { type: 'storage', },
                    },
                ],
            });
            this.bindGroup_debug.MODE_3DGS.set3 = this.device.createBindGroup({
                label: `debug.MODE_3DGS.set3`,
                layout: this.bindGroupLayout_debug.MODE_3DGS.set3,
                entries: [
                    {   // set other debug
                        binding: 0,
                        resource: {
                            buffer: this.set_other.debug,
                        },
                    },
                ],
            });
        }

        this.bindGroupLayout_read.MODE_3DGS.set1 = this.device.createBindGroupLayout({
            entries: [
                {   // set1.pos
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
                {   // set1.cov3d
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
                {   // set1.color
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
                {   // set1.sh
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
            ],
        });
        this.bindGroup_read.MODE_3DGS.set1 = this.device.createBindGroup({
            label: `read.MODE_3DGS.set1`,
            layout: this.bindGroupLayout_read.MODE_3DGS.set1,
            entries: [
                {   // set1.pos
                    binding: 0,
                    resource: {
                        buffer: this.set1.pos,
                    },
                },
                {   // set1.cov3d
                    binding: 1,
                    resource: {
                        buffer: this.set1.cov3d,
                    },
                },
                {   // set1.color
                    binding: 2,
                    resource: {
                        buffer: this.set1.color,
                    },
                },
                {   // set1.sh
                    binding: 3,
                    resource: {
                        buffer: this.set1.sh,
                    },
                },
            ],
        });

        this.bindGroupLayout_read.MODE_3DGS.set2 = this.device.createBindGroupLayout({
            entries: [
                {   // set2.key
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
                {   // set2.index
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
            ],
        });
        this.bindGroup_read.MODE_3DGS.set2 = this.device.createBindGroup({
            label: `read.MODE_3DGS.set2`,
            layout: this.bindGroupLayout_read.MODE_3DGS.set2,
            entries: [
                {   // set2.key
                    binding: 0,
                    resource: {
                        buffer: this.set2.key,
                    },
                },
                {   // set2.index
                    binding: 1,
                    resource: {
                        buffer: this.set2.index,
                    },
                },
            ],
        });

        /**
         * MODE_SpaceTime_LITE
         */
        const maxCount = GlobalVar.MAX_SPLAT_COUNT;
        this.bindGroupLayout.MODE_SpaceTime_LITE.set1 = this.device.createBindGroupLayout({
            entries: [
                {   // set1.pos => pos3
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
                {   // set1.cov3d => rest_feature6
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
                {   // set1.color => feature3 | opacity1
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
                {   // set1.sh => motion9
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
                {   // set1.sh => scale3
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
                {   // set1.sh => rot_omega8
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
                {   // set1.sh => trbf_center1 | trbf_scale1
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage', },
                },
            ],
        });
        this.bindGroup.MODE_SpaceTime_LITE.set1 = this.device.createBindGroup({
            layout: this.bindGroupLayout.MODE_SpaceTime_LITE.set1,
            entries: [
                {   // set1.pos => pos3
                    binding: 0,
                    resource: {
                        buffer: this.set1.pos,
                    },
                },
                {   // set1.cov3d => rest_feature6
                    binding: 1,
                    resource: {
                        buffer: this.set1.cov3d,
                    },
                },
                {   // set1.color => feature3 | opacity1
                    binding: 2,
                    resource: {
                        buffer: this.set1.color,
                    },
                },
                {   // set1.sh => motion9
                    binding: 3,
                    resource: {
                        buffer: this.set1.sh,
                        offset: 0,
                        size: maxCount * 9,
                    },
                },
                {   // set1.sh => scale3
                    binding: 4,
                    resource: {
                        buffer: this.set1.sh,
                        offset: maxCount * 9,
                        size: maxCount * 3,
                    },
                },
                {   // set1.sh => rot_omega8
                    binding: 5,
                    resource: {
                        buffer: this.set1.sh,
                        offset: maxCount * 12,
                        size: maxCount * 8,
                    },
                },
                {   // set1.sh => trbf_center1 | trbf_scale1
                    binding: 6,
                    resource: {
                        buffer: this.set1.sh,
                        offset: maxCount * 20,
                        size: maxCount * 2,
                    },
                },
            ],
        });

        this.bindGroupLayout.MODE_SpaceTime_LITE.set2 = this.bindGroupLayout.MODE_3DGS.set2;
        this.bindGroup.MODE_SpaceTime_LITE.set2 = this.bindGroup.MODE_3DGS.set2;

        this.bindGroupLayout.MODE_SpaceTime_LITE.set3 = this.bindGroupLayout.MODE_3DGS.set3;
        this.bindGroup.MODE_SpaceTime_LITE.set3 = this.bindGroup.MODE_3DGS.set3;

        if (GlobalVar.DEBUG) {
            this.bindGroupLayout_debug.MODE_SpaceTime_LITE.set3 = this.bindGroupLayout_debug.MODE_3DGS.set3;
            this.bindGroup_debug.MODE_SpaceTime_LITE.set3 = this.bindGroup_debug.MODE_3DGS.set3;
        }

        this.bindGroupLayout_read.MODE_SpaceTime_LITE.set1 = this.device.createBindGroupLayout({
            label: `read.MODE_SpaceTime_LITE.set1`, 
            entries: [
                {   // set1.pos => pos3
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
                {   // set1.cov3d => rest_feature6
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
                {   // set1.color => feature3 | opacity1
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
                {   // set1.sh => motion9
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
                {   // set1.sh => scale3
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
                {   // set1.sh => rot_omega8
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
                {   // set1.sh => trbf_center1 | trbf_scale1
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage', },
                },
            ],
        });
        this.bindGroup_read.MODE_SpaceTime_LITE.set1 = this.device.createBindGroup({
            label: `read.MODE_SpaceTime_LITE.set1`, 
            layout: this.bindGroupLayout_read.MODE_SpaceTime_LITE.set1,
            entries: [
                {   // set1.pos => pos3
                    binding: 0,
                    resource: {
                        buffer: this.set1.pos,
                    },
                },
                {   // set1.cov3d => rest_feature6
                    binding: 1,
                    resource: {
                        buffer: this.set1.cov3d,
                    },
                },
                {   // set1.color => feature3 | opacity1
                    binding: 2,
                    resource: {
                        buffer: this.set1.color,
                    },
                },
                {   // set1.sh => motion9
                    binding: 3,
                    resource: {
                        buffer: this.set1.sh,
                        offset: 0,
                        size: maxCount * 9,
                    },
                },
                {   // set1.sh => scale3
                    binding: 4,
                    resource: {
                        buffer: this.set1.sh,
                        offset: maxCount * 9,
                        size: maxCount * 3,
                    },
                },
                {   // set1.sh => rot_omega8
                    binding: 5,
                    resource: {
                        buffer: this.set1.sh,
                        offset: maxCount * 12,
                        size: maxCount * 8,
                    },
                },
                {   // set1.sh => trbf_center1 | trbf_scale1
                    binding: 6,
                    resource: {
                        buffer: this.set1.sh,
                        offset: maxCount * 20,
                        size: maxCount * 2,
                    },
                },
            ],
        });

        this.bindGroupLayout_read.MODE_SpaceTime_LITE.set2 = this.bindGroupLayout_read.MODE_3DGS.set2;
        this.bindGroup_read.MODE_SpaceTime_LITE.set2 = this.bindGroup_read.MODE_3DGS.set2;

    }

    createPipeline(bindGroupLayout0, bindGroupLayout3) {
        this.createPipeline_(`MODE_3DGS`, bindGroupLayout0, bindGroupLayout3);
        this.createPipeline_(`MODE_SpaceTime_LITE`, bindGroupLayout0, bindGroupLayout3);
    }

    createPipeline_(type, bindGroupLayout0, bindGroupLayout3) {
        let is4dgs = (type !== `MODE_3DGS`);
        {   // parsePly
            this.pipelineLayout[type].parsePly = this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout0, this.bindGroupLayout[type].set1, null, bindGroupLayout3],
            });
            const shaderModule = this.device.createShaderModule({
                code: is4dgs ? parse_ply_comp_4dgs_wgsl : parse_ply_comp_wgsl,
            });
            this.pipeline[type].parsePly = this.device.createComputePipeline({
                layout: this.pipelineLayout[type].parsePly,
                compute: {
                    module: shaderModule,
                    entryPoint: "main",
                },
            });
        }
        {   // rank
            this.pipelineLayout[type].rank = this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout0, this.bindGroupLayout_read[type].set1, this.bindGroupLayout[type].set2, this.bindGroupLayout[type].set3],
            });
            const shaderModule = this.device.createShaderModule({
                code: is4dgs ? rank_comp_4dgs_wgsl : rank_comp_wgsl,
            });
            this.pipeline[type].rank = this.device.createComputePipeline({
                layout: this.pipelineLayout[type].rank,
                compute: {
                    module: shaderModule,
                    entryPoint: "main",
                },
            });
        }
        if (GlobalVar.DEBUG) {  // debug splat
            this.pipelineLayout[type].debug = this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout0, this.bindGroupLayout[type].set1, this.bindGroupLayout[type].set2, this.bindGroupLayout_debug[type].set3],
            });
            const shaderModule = this.device.createShaderModule({
                code: is4dgs ? splat_debug_4dgs_wgsl : splat_debug_wgsl,
            });
            this.pipeline[type].debug = this.device.createComputePipeline({
                layout: this.pipelineLayout[type].debug,
                compute: {
                    module: shaderModule,
                    entryPoint: "main",
                },
            });
        }
        {   // splat
            this.pipelineLayout[type].splat = this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout0, this.bindGroupLayout_read[type].set1, this.bindGroupLayout_read[type].set2,],
            });
            this.pipeline[type].splat = this.device.createRenderPipeline({
                layout: this.pipelineLayout[type].splat,
                fragment: {
                    entryPoint: "frag_main",
                    module: this.device.createShaderModule({
                        code: is4dgs ? splat_4dgs_wgsl : splat_wgsl,
                    }),
                    targets: [
                        {
                            blend: {
                                alpha: {
                                    srcFactor: "src-alpha",
                                    dstFactor: "one-minus-src-alpha",
                                    operator: "add",
                                },
                                color: {
                                    srcFactor: "src-alpha",
                                    dstFactor: "one-minus-src-alpha",
                                    operator: "add",
                                },
                            },
                            format: this.presentationFormat,
                        },
                    ],
                },
                primitive: {
                    topology: "triangle-list",
                    frontFace: "ccw",
                    cullMode: "none",
                },
                vertex: {
                    entryPoint: "vert_main",
                    module: this.device.createShaderModule({
                        code: is4dgs ? splat_4dgs_wgsl : splat_wgsl,
                    }),
                }
            });
        }
    }

    async getVisibleNum(guiContent, pointCnt) {
        await this.set_other.staging.mapAsync(GPUMapMode.READ, 0, 4);
        let num = (new Uint32Array(this.set_other.staging.getMappedRange()))[0];
        guiContent.visibleNum = `${num}/${pointCnt}  ${(num / pointCnt * 100).toFixed(1)}%`;
        this.set_other.staging.unmap();
    }

    setFormat(format) {
        this.presentationFormat = format;
    }

    get visibleNumBuffer() {
        return this.set3.visibleNum;
    }

    get keyBuffer() {
        return this.set2.key;
    }

    get indexBuffer() {
        return this.set2.index;
    }

}

export {GSRenderer};