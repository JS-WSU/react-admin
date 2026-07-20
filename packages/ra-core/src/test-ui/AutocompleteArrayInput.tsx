import * as React from 'react';
import { RaRecord } from 'ra-core';
import { AutocompleteInput, AutocompleteInputProps } from './AutocompleteInput';

export const AutocompleteArrayInput = <
    OptionType extends RaRecord = RaRecord,
    DisableClearable extends boolean | undefined = boolean | undefined,
    SupportCreate extends boolean | undefined = false,
>({
    defaultValue,
    ...props
}: AutocompleteArrayInputProps<
    OptionType,
    DisableClearable,
    SupportCreate
>) => (
    <AutocompleteInput<OptionType, true, DisableClearable, SupportCreate>
        {...props}
        multiple
        defaultValue={defaultValue ?? (props.disabled ? undefined : [])}
    />
);

export type AutocompleteArrayInputProps<
    OptionType extends RaRecord = RaRecord,
    DisableClearable extends boolean | undefined = false,
    SupportCreate extends boolean | undefined = false,
> = Omit<
    AutocompleteInputProps<OptionType, true, DisableClearable, SupportCreate>,
    'defaultValue'
> & {
    defaultValue?: OptionType[];
};
