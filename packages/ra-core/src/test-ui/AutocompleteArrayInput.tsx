import * as React from 'react';
import type { RaRecord } from '../types';
import { AutocompleteInput } from './AutocompleteInput';

type InferredAutocompleteInputProps = React.ComponentProps<typeof AutocompleteInput>;

export const AutocompleteArrayInput = <
    OptionType extends RaRecord = RaRecord,
    DisableClearable extends boolean | undefined = false,
    SupportCreate extends boolean | undefined = false,
>(
    props: AutocompleteArrayInputProps<
        OptionType,
        DisableClearable,
        SupportCreate
    >
) => {
    return <AutocompleteInput multiple {...(props as any)} />;
};

export type AutocompleteArrayInputProps<
    OptionType extends RaRecord = RaRecord,
    DisableClearable extends boolean | undefined = false,
    SupportCreate extends boolean | undefined = false,
> = Omit<InferredAutocompleteInputProps, 'defaultValue' | 'multiple'> & {
    defaultValue?: OptionType[];
};
